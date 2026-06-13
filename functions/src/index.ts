import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';
import type { DiaryEntry, Ingredient } from './types.js';

// Firebase automatically authenticates when deployed to Cloud Function;
// there is no need to provide credentials in code or environment variables
initializeApp();

const adminAuth = getAuth();
const db = getFirestore();

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function verifyToken(authHeader: string | undefined): Promise<string> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header');
  }
  const token = authHeader.slice(7);
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

// ---------------------------------------------------------------------------
// MCP server factory — one instance per request (stateless)
// ---------------------------------------------------------------------------

const AUTH_REQUIRED = {
  content: [{ type: 'text' as const, text: 'Authentication required. Provide a valid Firebase ID token as a Bearer token.' }],
};

function buildMcpServer(uid: string | null): McpServer {
  const server = new McpServer({
    name: 'morpholody',
    version: '1.0.0',
  });

  // ── Diary tools ─────────────────────────────────────────────────────────

  server.tool(
    'get_diary_entry',
    'Get the diary entry for a specific date, including meals, calories, and body weight.',
    { date: z.string().describe('Date in YYYY-MM-DD format, e.g. "2024-03-15"') },
    async ({ date }) => {
      if (!uid) return AUTH_REQUIRED;
      const snap = await db.doc(`users/${uid}/diary/${date}`).get();
      if (!snap.exists) {
        return { content: [{ type: 'text', text: `No diary entry found for ${date}.` }] };
      }
      const entry = snap.data() as DiaryEntry;
      return { content: [{ type: 'text', text: formatDiaryEntry(entry) }] };
    },
  );

  server.tool(
    'get_diary_entries_for_range',
    'Get all diary entries between two dates (inclusive). Maximum range is 90 days.',
    {
      start_date: z.string().describe('Start date in YYYY-MM-DD format'),
      end_date: z.string().describe('End date in YYYY-MM-DD format'),
    },
    async ({ start_date, end_date }) => {
      if (!uid) return AUTH_REQUIRED;
      if (daysBetween(start_date, end_date) > 90) {
        return {
          content: [
            { type: 'text', text: 'Date range exceeds 90-day limit. Please narrow the range.' },
          ],
        };
      }
      const snap = await db
        .collection(`users/${uid}/diary`)
        .where('date', '>=', start_date)
        .where('date', '<=', end_date)
        .orderBy('date')
        .get();

      if (snap.empty) {
        return {
          content: [
            { type: 'text', text: `No diary entries found between ${start_date} and ${end_date}.` },
          ],
        };
      }

      const entries = snap.docs.map((d) => d.data() as DiaryEntry);
      const text = entries.map(formatDiaryEntry).join('\n\n---\n\n');
      return { content: [{ type: 'text', text }] };
    },
  );

  server.tool(
    'get_diary_summary_for_month',
    'Get a statistical summary for a given month: average daily calories, average weight, and number of entries.',
    {
      year: z.number().int().describe('Year, e.g. 2024'),
      month: z.number().int().min(1).max(12).describe('Month number 1–12'),
    },
    async ({ year, month }) => {
      if (!uid) return AUTH_REQUIRED;
      const mm = String(month).padStart(2, '0');
      const snap = await db
        .collection(`users/${uid}/diary`)
        .where('date', '>=', `${year}-${mm}-01`)
        .where('date', '<=', `${year}-${mm}-31`)
        .orderBy('date')
        .get();

      if (snap.empty) {
        return {
          content: [{ type: 'text', text: `No entries found for ${year}-${mm}.` }],
        };
      }

      const entries = snap.docs.map((d) => d.data() as DiaryEntry);
      const withCalories = entries.filter((e) => e.calories != null);
      const withWeight = entries.filter((e) => e.weight != null);

      const avgCalories =
        withCalories.length > 0
          ? Math.round(
              withCalories.reduce((s, e) => s + (e.calories ?? 0), 0) / withCalories.length,
            )
          : null;
      const avgWeight =
        withWeight.length > 0
          ? (withWeight.reduce((s, e) => s + (e.weight ?? 0), 0) / withWeight.length).toFixed(1)
          : null;

      const lines = [
        `Month: ${year}-${mm}`,
        `Total entries: ${entries.length}`,
        avgCalories != null
          ? `Average daily calories: ${avgCalories} kcal`
          : 'Average daily calories: not enough data',
        avgWeight != null
          ? `Average body weight: ${avgWeight} kg`
          : 'Average body weight: not enough data',
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ── Ingredient tools ─────────────────────────────────────────────────────

  server.tool(
    'list_ingredients',
    "List all ingredients in the user's food library, sorted alphabetically.",
    {},
    async () => {
      if (!uid) return AUTH_REQUIRED;
      const snap = await db.collection(`users/${uid}/ingredients`).orderBy('nameLower').get();

      if (snap.empty) {
        return { content: [{ type: 'text', text: 'No ingredients found in your library.' }] };
      }

      const ingredients = snap.docs.map((d) => d.data() as Ingredient);
      const text = ingredients
        .map((i) => `• ${i.name} — ${i.caloriesPerUnit} kcal per ${i.unitsLabel ?? 'unit'}`)
        .join('\n');
      return { content: [{ type: 'text', text }] };
    },
  );

  server.tool(
    'search_ingredients',
    "Search the user's ingredient library by name prefix.",
    {
      query: z
        .string()
        .describe('Name prefix to search for, e.g. "chick" to find "Chicken breast"'),
    },
    async ({ query }) => {
      if (!uid) return AUTH_REQUIRED;
      const lower = query.toLowerCase();
      const snap = await db
        .collection(`users/${uid}/ingredients`)
        .where('nameLower', '>=', lower)
        .where('nameLower', '<=', lower + '')
        .orderBy('nameLower')
        .limit(20)
        .get();

      if (snap.empty) {
        return { content: [{ type: 'text', text: `No ingredients found matching "${query}".` }] };
      }

      const ingredients = snap.docs.map((d) => d.data() as Ingredient);
      const text = ingredients
        .map((i) => `• ${i.name} — ${i.caloriesPerUnit} kcal per ${i.unitsLabel ?? 'unit'}`)
        .join('\n');
      return { content: [{ type: 'text', text }] };
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDiaryEntry(entry: DiaryEntry): string {
  const lines: string[] = [`Date: ${entry.date}`];
  if (entry.weight != null) lines.push(`Body weight: ${entry.weight} kg`);
  if (entry.calories != null) lines.push(`Total calories: ${entry.calories} kcal`);

  for (const meal of entry.meals ?? []) {
    lines.push(`\nMeal at ${meal.time}${meal.calories != null ? ` (${meal.calories} kcal)` : ''}:`);
    for (const comp of meal.components ?? []) {
      const units =
        'units' in comp && comp.units != null
          ? ` × ${comp.units} ${comp.unitsLabel ?? 'units'}`
          : '';
      const cal = comp.calories != null ? ` — ${comp.calories} kcal` : '';
      lines.push(`  • ${comp.name}${units}${cal}`);
    }
  }
  return lines.join('\n');
}

function daysBetween(a: string, b: string): number {
  return Math.abs((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Firebase HTTP Function
// ---------------------------------------------------------------------------

// Requests that don't expose user data and are safe to serve unauthenticated.
function isPublicRequest(req: { method: string; body?: { method?: string } }): boolean {
  if (req.method === 'GET') return true;
  const rpcMethod = req.body?.method;
  return rpcMethod === 'tools/list' || rpcMethod === 'initialize';
}

export const mcp = onRequest({ region: 'europe-west3', timeoutSeconds: 540 }, async (req, res) => {
  if (req.method === 'DELETE') {
    res.status(200).json({ message: 'Session terminated' });
    return;
  }

  let uid: string | null = null;
  try {
    uid = await verifyToken(req.headers.authorization as string | undefined);
  } catch {
    if (!isPublicRequest(req)) {
      res
        .status(401)
        .json({ error: 'Unauthorized: provide a valid Firebase ID token as Bearer token' });
      return;
    }
  }

  const server = buildMcpServer(uid);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on('close', () => transport.close());
  await server.connect(transport);

  if (req.method === 'GET') {
    await transport.handleRequest(req, res);
  } else {
    await transport.handleRequest(req, res, req.body);
  }
});

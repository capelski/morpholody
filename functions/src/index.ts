import Anthropic from '@anthropic-ai/sdk';
import cors from 'cors';
import express from 'express';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/https';

// Firebase automatically authenticates when deployed to Cloud Function;
// there is no need to provide credentials in code or environment variables
initializeApp();

const auth = getAuth();
const db = getFirestore();

// ---------------------------------------------------------------------------
// Anthropic client
// ---------------------------------------------------------------------------
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Firestore helpers (read-only — the MCP server never writes)
// ---------------------------------------------------------------------------
async function getDiaryEntries(uid: string, startDate: string, endDate: string) {
  const snap = await db
    .collection('users')
    .doc(uid)
    .collection('diary')
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .get();
  return snap.docs.map((d) => d.data());
}

async function getDiaryEntry(uid: string, date: string) {
  const snap = await db.collection('users').doc(uid).collection('diary').doc(date).get();
  return snap.exists ? snap.data() : null;
}

async function getIngredients(uid: string) {
  const snap = await db
    .collection('users')
    .doc(uid)
    .collection('ingredients')
    .orderBy('nameLower')
    .get();
  return snap.docs.map((d) => d.data());
}

// ---------------------------------------------------------------------------
// Tool definitions for Claude
// ---------------------------------------------------------------------------
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_diary_entries',
    description:
      'Fetch diary entries (weight + meals + calories) for a date range. ' +
      'Use this to answer questions about what the user ate over a period, ' +
      'their calorie intake, weight trends, or meal patterns.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format (inclusive)',
        },
        end_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format (inclusive)',
        },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_diary_entry',
    description:
      'Fetch the diary entry for a single specific date. ' +
      'Use this when the user asks about a particular day.',
    input_schema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'get_ingredients',
    description:
      "Fetch all ingredients in the user's ingredient library with their " +
      'calories per unit. Use this to answer questions about nutritional ' +
      'values of ingredients or what ingredients the user has saved.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------
async function executeTool(
  toolName: string,
  toolInput: Record<string, string>,
  uid: string,
): Promise<string> {
  try {
    if (toolName === 'get_diary_entries') {
      const entries = await getDiaryEntries(uid, toolInput.start_date, toolInput.end_date);
      if (entries.length === 0) return 'No diary entries found for this date range.';
      return JSON.stringify(entries);
    }
    if (toolName === 'get_diary_entry') {
      const entry = await getDiaryEntry(uid, toolInput.date);
      if (!entry) return `No diary entry found for ${toolInput.date}.`;
      return JSON.stringify(entry);
    }
    if (toolName === 'get_ingredients') {
      const ingredients = await getIngredients(uid);
      if (ingredients.length === 0) return 'No ingredients found.';
      return JSON.stringify(ingredients);
    }
    return `Unknown tool: ${toolName}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return `Error executing tool: ${message}`;
  }
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

if (process.env.ALLOWED_ORIGINS) {
  const origins = process.env.ALLOWED_ORIGINS.split(',');
  app.use(cors({ origin: origins }));
}

app.use(express.json());

app.post('/chat', async (req, res) => {
  const { message, idToken, history } = req.body as {
    message: string;
    idToken: string;
    history?: Anthropic.MessageParam[];
  };

  if (!message || !idToken) {
    res.status(400).json({ error: 'message and idToken are required' });
    return;
  }

  // Verify Firebase ID token
  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    res.status(401).json({ error: 'Invalid or expired Firebase token' });
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  const messages: Anthropic.MessageParam[] = [
    ...(history ?? []),
    { role: 'user', content: message },
  ];

  try {
    let response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      thinking: { type: 'disabled' },
      system: `You are a helpful nutrition and health assistant embedded in the Morpholody app.
You have access to the user's food diary and ingredient library via tools.
Today's date is ${today}.
When the user asks about their eating habits, weight, calories, or specific foods, use the tools to look up their actual data before answering.
Be concise, friendly, and specific — reference the actual data you find rather than giving generic advice.
Do not share raw JSON with the user; summarise findings in plain language.`,
      tools: TOOLS,
      messages,
    });

    // Agentic loop: handle tool calls until Claude is done
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => ({
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: await executeTool(block.name, block.input as Record<string, string>, uid),
        })),
      );

      messages.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 4096,
        thinking: { type: 'disabled' },
        system: `You are a helpful nutrition and health assistant embedded in the Morpholody app.
You have access to the user's food diary and ingredient library via tools.
Today's date is ${today}.
When the user asks about their eating habits, weight, calories, or specific foods, use the tools to look up their actual data before answering.
Be concise, friendly, and specific — reference the actual data you find rather than giving generic advice.
Do not share raw JSON with the user; summarise findings in plain language.`,
        tools: TOOLS,
        messages,
      });
    }

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    const assistantText = textBlock?.text ?? '';

    // Return assistant reply + updated history (without tool internals for the client)
    messages.push({ role: 'assistant', content: assistantText });

    // Build clean history (user text + assistant text only) to send back
    const cleanHistory = messages.filter(
      (m): m is Anthropic.MessageParam =>
        typeof m.content === 'string' ||
        (Array.isArray(m.content) &&
          m.content.every((b) => (b as { type: string }).type === 'text')),
    );

    res.json({ reply: assistantText, history: cleanHistory });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Chat error:', err);
    res.status(500).json({ error: message });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

export const mcp = onRequest({ region: 'europe-west3' }, app);

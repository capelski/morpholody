const DB_NAME = "morpholody";
const DB_VERSION = 6;
const DIARY_STORE = "diary";
const MEAL_COMPONENTS_STORE = "mealComponents";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = req.result;
        const tx = req.transaction!;

        if (e.oldVersion === 0) {
          // Fresh install — create all stores directly, no migration needed.
          db.createObjectStore(DIARY_STORE, { keyPath: "date" });
          const mcStore = db.createObjectStore(MEAL_COMPONENTS_STORE, { keyPath: "name" });
          mcStore.createIndex("by_name_lower", "nameLower");
          return;
        }

        if (e.oldVersion < 3) {
          // Upgrading from v1 or v2: migrate weights and meals into diary, then
          // drop the old object stores.
          const diaryStore = db.createObjectStore(DIARY_STORE, {
            keyPath: "date",
          });
          const diary = new Map<
            string,
            {
              date: string;
              weight: number | null;
              meals: Array<{ time: string; description: string }>;
            }
          >();

          // Phase 1 — read all weight entries.
          const weightReq = tx.objectStore("weights").openCursor();
          weightReq.onsuccess = () => {
            const cursor = weightReq.result;
            if (cursor) {
              const date = cursor.key as string;
              diary.set(date, { date, weight: cursor.value as number, meals: [] });
              cursor.continue();
            } else {
              // Phase 2 — read all meal entries (only present from v2 onwards).
              const flush = () => {
                for (const entry of diary.values()) {
                  entry.meals.sort((a, b) => a.time.localeCompare(b.time));
                  diaryStore.put(entry);
                }
                db.deleteObjectStore("weights");
                if (e.oldVersion >= 2) db.deleteObjectStore("meals");
                const mcStore = db.createObjectStore(MEAL_COMPONENTS_STORE, { keyPath: "name" });
                mcStore.createIndex("by_name_lower", "nameLower");
              };

              if (e.oldVersion >= 2) {
                const mealReq = tx.objectStore("meals").openCursor();
                mealReq.onsuccess = () => {
                  const cursor = mealReq.result;
                  if (cursor) {
                    const { dateKey: dk, time, description } =
                      cursor.value as {
                        dateKey: string;
                        time: string;
                        description: string;
                      };
                    if (!diary.has(dk)) {
                      diary.set(dk, { date: dk, weight: null, meals: [] });
                    }
                    diary.get(dk)!.meals.push({ time, description });
                    cursor.continue();
                  } else {
                    flush();
                  }
                };
                mealReq.onerror = () => reject(mealReq.error);
              } else {
                flush();
              }
            }
          };
          weightReq.onerror = () => reject(weightReq.error);
          return;
        }

        if (e.oldVersion === 3) {
          // v3 → v5: add mealComponents store with lowercase index.
          const mcStore = db.createObjectStore(MEAL_COMPONENTS_STORE, { keyPath: "name" });
          mcStore.createIndex("by_name_lower", "nameLower");
          return;
        }

        if (e.oldVersion === 4) {
          // v4 → v5: add nameLower index and back-fill existing records.
          const mcStore = tx.objectStore(MEAL_COMPONENTS_STORE);
          mcStore.createIndex("by_name_lower", "nameLower");
          const cursorReq = mcStore.openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
              const rec = cursor.value as { name: string };
              cursor.update({ ...rec, nameLower: rec.name.toLowerCase() });
              cursor.continue();
            }
          };
          cursorReq.onerror = () => reject(cursorReq.error);
          return;
        }

        // v5 → v6: back-fill id (UUID) on existing mealComponents records.
        const mcStore = tx.objectStore(MEAL_COMPONENTS_STORE);
        const cursorReq = mcStore.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            const rec = cursor.value as { id?: string };
            if (!rec.id) cursor.update({ ...rec, id: crypto.randomUUID() });
            cursor.continue();
          }
        };
        cursorReq.onerror = () => reject(cursorReq.error);
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

/** Convert a Date object to a YYYY-MM-DD string suitable for use as a diary key. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface MealComponent {
  name: string;
  quantity: number | null;
  calories: number | null;
  mealComponentId?: string | null;
}

export interface DiaryEntry {
  date: string; // YYYY-MM-DD
  weight: number | null;
  /** Kept for backward compatibility with older entries; always null for new saves. */
  calories: number | null;
  meals: Array<{ time: string; calories: number | null; components: MealComponent[] }>;
}

/** Fetch the diary entry for a given date key (YYYY-MM-DD). Returns null if none exists yet. */
export async function getDiaryEntry(date: string): Promise<DiaryEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(DIARY_STORE, "readonly")
      .objectStore(DIARY_STORE)
      .get(date);
    req.onsuccess = () => resolve((req.result as DiaryEntry) ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** Write (or overwrite) the diary entry for a given date key. */
export async function saveDiaryEntry(
  date: string,
  data: { weight: DiaryEntry["weight"]; meals: Array<{ time: string; components: MealComponent[] }> },
): Promise<void> {
  const mealsWithCalories = data.meals.map((m) => {
    const mealCal = m.components.reduce<number | null>((s, c) => {
      if (c.calories == null) return s;
      return (s ?? 0) + c.calories;
    }, null);
    return { ...m, calories: mealCal };
  });
  const calories = mealsWithCalories.reduce<number | null>((sum, m) => {
    if (m.calories == null) return sum;
    return (sum ?? 0) + m.calories;
  }, null);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(DIARY_STORE, "readwrite")
      .objectStore(DIARY_STORE)
      .put({ date, weight: data.weight, meals: mealsWithCalories, calories });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function cursorDiary(
  store: IDBObjectStore,
  range?: IDBKeyRange,
): Promise<DiaryEntry[]> {
  return new Promise((resolve, reject) => {
    const req = store.openCursor(range);
    const entries: DiaryEntry[] = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        entries.push(cursor.value as DiaryEntry);
        cursor.continue();
      } else {
        resolve(entries);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Return all diary entries for the given month (1-indexed). */
export async function getDiaryEntriesForMonth(
  year: number,
  month: number,
): Promise<DiaryEntry[]> {
  const db = await openDB();
  const m = String(month).padStart(2, "0");
  const range = IDBKeyRange.bound(`${year}-${m}-01`, `${year}-${m}-31`);
  return cursorDiary(
    db.transaction(DIARY_STORE, "readonly").objectStore(DIARY_STORE),
    range,
  );
}

/** Fetch meal component suggestions matching the given prefix (case-insensitive, up to 10). */
export async function getMealComponentSuggestions(
  prefix: string,
): Promise<{ id: string; name: string; caloriesPerUnit: number; units?: string }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const lower = prefix.toLowerCase();
    const range = IDBKeyRange.bound(lower, lower + "￿");
    const req = db
      .transaction(MEAL_COMPONENTS_STORE, "readonly")
      .objectStore(MEAL_COMPONENTS_STORE)
      .index("by_name_lower")
      .getAll(range, 10);
    req.onsuccess = () =>
      resolve(
        (req.result as { id?: string; name: string; caloriesPerUnit?: number; units?: string }[]).map((r) => ({
          id: r.id ?? "",
          name: r.name,
          caloriesPerUnit: r.caloriesPerUnit ?? 0,
          units: r.units,
        })),
      );
    req.onerror = () => reject(req.error);
  });
}

export interface StoredMealComponent {
  id: string;
  name: string;
  nameLower: string;
  caloriesPerUnit: number;
  units?: string;
}

/** Return all meal components sorted by name (case-insensitive). */
export async function getAllMealComponents(): Promise<StoredMealComponent[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(MEAL_COMPONENTS_STORE, "readonly")
      .objectStore(MEAL_COMPONENTS_STORE)
      .index("by_name_lower")
      .getAll();
    req.onsuccess = () => resolve(req.result as StoredMealComponent[]);
    req.onerror = () => reject(req.error);
  });
}

/** Upsert a meal component into the mealComponents store. Returns the component's id. */
export async function saveMealComponent(name: string, caloriesPerUnit: number, units?: string): Promise<string> {
  const db = await openDB();
  const store = db.transaction(MEAL_COMPONENTS_STORE, "readwrite").objectStore(MEAL_COMPONENTS_STORE);
  // Preserve existing id if the record already exists.
  const existing = await new Promise<{ id?: string } | undefined>((res, rej) => {
    const r = store.get(name);
    r.onsuccess = () => res(r.result as { id?: string } | undefined);
    r.onerror = () => rej(r.error);
  });
  const id = existing?.id ?? crypto.randomUUID();
  const doc: Record<string, unknown> = { id, name, nameLower: name.toLowerCase(), caloriesPerUnit };
  if (units && units.trim()) doc.units = units.trim();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEAL_COMPONENTS_STORE, "readwrite");
    const req = tx.objectStore(MEAL_COMPONENTS_STORE).put(doc);
    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
  });
}

/** Return a map from day-of-month to the kinds of data recorded for that day. */
export async function getDayDataForMonth(
  year: number,
  month: number,
): Promise<Map<number, { hasWeight: boolean; hasMeals: boolean }>> {
  const entries = await getDiaryEntriesForMonth(year, month);
  const map = new Map<number, { hasWeight: boolean; hasMeals: boolean }>();
  for (const entry of entries) {
    const day = parseInt(entry.date.split("-")[2], 10);
    map.set(day, {
      hasWeight: entry.weight != null,
      hasMeals: entry.meals.length > 0,
    });
  }
  return map;
}

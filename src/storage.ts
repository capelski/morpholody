const DB_NAME = "morpholody";
const DB_VERSION = 8;
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
          const mcStore = db.createObjectStore(MEAL_COMPONENTS_STORE, { keyPath: "id" });
          mcStore.createIndex("by_name_lower", "nameLower");
          mcStore.createIndex("by_name", "name");
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
                const mcStore = db.createObjectStore(MEAL_COMPONENTS_STORE, { keyPath: "id" });
                mcStore.createIndex("by_name_lower", "nameLower");
                mcStore.createIndex("by_name", "name");
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
          // v3 → v7: add mealComponents store keyed by id.
          const mcStore = db.createObjectStore(MEAL_COMPONENTS_STORE, { keyPath: "id" });
          mcStore.createIndex("by_name_lower", "nameLower");
          mcStore.createIndex("by_name", "name");
          return;
        }

        if (e.oldVersion === 4) {
          // v4 → v7: add nameLower index, back-fill, then recreate store keyed by id.
          // Fall through to the v5/v6 → v7 block below by not returning.
          const oldStore = tx.objectStore(MEAL_COMPONENTS_STORE);
          if (!oldStore.indexNames.contains("by_name_lower")) {
            oldStore.createIndex("by_name_lower", "nameLower");
          }
        }

        // v4/v5/v6 → v7: recreate mealComponents store keyed by id instead of name.
        // Back-fills nameLower and id on any records that predate those fields.
        if (e.oldVersion < 7) {
          const oldStore = tx.objectStore(MEAL_COMPONENTS_STORE);
          const allRecsReq = oldStore.getAll();
          allRecsReq.onsuccess = () => {
            const recs = allRecsReq.result as Array<Record<string, unknown>>;
            db.deleteObjectStore(MEAL_COMPONENTS_STORE);
            const newStore = db.createObjectStore(MEAL_COMPONENTS_STORE, { keyPath: "id" });
            newStore.createIndex("by_name_lower", "nameLower");
            newStore.createIndex("by_name", "name");
            for (const rec of recs) {
              if (!rec.id) rec.id = crypto.randomUUID();
              if (!rec.nameLower) rec.nameLower = (rec.name as string).toLowerCase();
              newStore.put(rec);
            }
          };
          allRecsReq.onerror = () => reject(allRecsReq.error);
        }

        // v7 → v8: back-fill UUIDs on diary entry, each meal, and each meal component.
        if (e.oldVersion < 8) {
          const diaryStore = tx.objectStore(DIARY_STORE);
          const cursorReq = diaryStore.openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor) return;
            const entry = cursor.value as Record<string, unknown>;
            if (!entry.id) entry.id = crypto.randomUUID();
            const meals = (entry.meals ?? []) as Array<Record<string, unknown>>;
            for (const meal of meals) {
              if (!meal.id) meal.id = crypto.randomUUID();
              const components = (meal.components ?? []) as Array<Record<string, unknown>>;
              for (const comp of components) {
                if (!comp.id) comp.id = crypto.randomUUID();
              }
            }
            cursor.update(entry);
            cursor.continue();
          };
          cursorReq.onerror = () => reject(cursorReq.error);
        }
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
  id: string;
  name: string;
  quantity: number | null;
  calories: number | null;
  mealComponentId?: string | null;
}

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number | null;
  /** Kept for backward compatibility with older entries; always null for new saves. */
  calories: number | null;
  meals: Array<{ id: string; time: string; calories: number | null; components: MealComponent[] }>;
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
  data: { id?: string; weight: DiaryEntry["weight"]; meals: Array<{ id?: string; time: string; components: Array<MealComponent & { id?: string }> }> },
): Promise<void> {
  // Fetch existing entry to preserve its top-level id if not provided.
  const existing = await getDiaryEntry(date);
  const entryId = data.id ?? existing?.id ?? crypto.randomUUID();
  const mealsWithCalories = data.meals.map((m, mi) => {
    const mealId = m.id ?? existing?.meals[mi]?.id ?? crypto.randomUUID();
    const components = m.components.map((c, ci) => ({
      ...c,
      id: c.id ?? existing?.meals[mi]?.components[ci]?.id ?? crypto.randomUUID(),
    }));
    const mealCal = components.reduce<number | null>((s, c) => {
      if (c.calories == null) return s;
      return (s ?? 0) + c.calories;
    }, null);
    return { ...m, id: mealId, components, calories: mealCal };
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
      .put({ id: entryId, date, weight: data.weight, meals: mealsWithCalories, calories });
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
  query: string,
): Promise<{ id: string; name: string; caloriesPerUnit: number; units?: string }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const lower = query.toLowerCase();
    const req = db
      .transaction(MEAL_COMPONENTS_STORE, "readonly")
      .objectStore(MEAL_COMPONENTS_STORE)
      .getAll();
    req.onsuccess = () => {
      const all = (req.result as { id?: string; name: string; nameLower?: string; caloriesPerUnit?: number; units?: string }[]);
      const starts: typeof all = [];
      const contains: typeof all = [];
      for (const r of all) {
        const nl = r.nameLower ?? r.name.toLowerCase();
        if (nl.startsWith(lower)) starts.push(r);
        else if (nl.includes(lower)) contains.push(r);
      }
      resolve(
        [...starts, ...contains].slice(0, 10).map((r) => ({
          id: r.id ?? "",
          name: r.name,
          caloriesPerUnit: r.caloriesPerUnit ?? 0,
          units: r.units,
        })),
      );
    };
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

/** Return a meal component by its ID, or undefined if not found. */
export async function getMealComponentById(id: string): Promise<StoredMealComponent | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(MEAL_COMPONENTS_STORE, "readonly").objectStore(MEAL_COMPONENTS_STORE).get(id);
    req.onsuccess = () => resolve(req.result as StoredMealComponent | undefined);
    req.onerror = () => reject(req.error);
  });
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
export async function saveMealComponent(name: string, caloriesPerUnit: number, units?: string, id?: string): Promise<string> {
  const db = await openDB();
  let resolvedId = id;
  if (!resolvedId) {
    // Look up any existing record by name to preserve its id.
    const existing = await new Promise<{ id?: string } | undefined>((res, rej) => {
      const r = db
        .transaction(MEAL_COMPONENTS_STORE, "readonly")
        .objectStore(MEAL_COMPONENTS_STORE)
        .index("by_name")
        .get(name);
      r.onsuccess = () => res(r.result as { id?: string } | undefined);
      r.onerror = () => rej(r.error);
    });
    resolvedId = existing?.id ?? crypto.randomUUID();
  }
  const doc: Record<string, unknown> = { id: resolvedId, name, nameLower: name.toLowerCase(), caloriesPerUnit };
  if (units && units.trim()) doc.units = units.trim();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(MEAL_COMPONENTS_STORE, "readwrite");
    const req = tx.objectStore(MEAL_COMPONENTS_STORE).put(doc);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  // Propagate name/calorie changes to all diary entries that reference this component.
  await propagateMealComponentUpdate(db, resolvedId, name, caloriesPerUnit);

  return resolvedId;
}

/** Update all diary entries that contain components linked to the given meal component id. */
async function propagateMealComponentUpdate(
  db: IDBDatabase,
  mealComponentId: string,
  name: string,
  caloriesPerUnit: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIARY_STORE, "readwrite");
    const store = tx.objectStore(DIARY_STORE);
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) { resolve(); return; }
      const entry = cursor.value as DiaryEntry;
      let changed = false;
      for (const meal of entry.meals) {
        for (const comp of meal.components) {
          if (comp.mealComponentId === mealComponentId) {
            comp.name = name;
            if (comp.quantity != null) {
              comp.calories = Math.round(caloriesPerUnit * comp.quantity);
            }
            changed = true;
          }
        }
        if (changed) {
          meal.calories = meal.components.reduce<number | null>((s, c) => {
            if (c.calories == null) return s;
            return (s ?? 0) + c.calories;
          }, null);
        }
      }
      if (changed) {
        const totalCalories = entry.meals.reduce<number | null>((s, m) => {
          if (m.calories == null) return s;
          return (s ?? 0) + m.calories;
        }, null);
        cursor.update({ ...entry, calories: totalCalories });
      }
      cursor.continue();
    };
    cursorReq.onerror = () => reject(cursorReq.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
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

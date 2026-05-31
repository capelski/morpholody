const DB_NAME = "morpholody";
const DB_VERSION = 3;
const DIARY_STORE = "diary";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = req.result;
        const tx = req.transaction!;

        if (e.oldVersion === 0) {
          // Fresh install — create diary store directly, no migration needed.
          db.createObjectStore(DIARY_STORE, { keyPath: "date" });
          return;
        }

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

export interface DiaryEntry {
  date: string; // YYYY-MM-DD
  weight: number | null;
  /** Sum of calories across all meals; null when no meal has a calorie value. */
  calories: number | null;
  meals: Array<{ time: string; description: string; calories: number | null }>;
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

/** Write (or overwrite) the diary entry for a given date key.
 *  The top-level `calories` field is computed from the meals array automatically. */
export async function saveDiaryEntry(
  date: string,
  data: Pick<DiaryEntry, "weight" | "meals">,
): Promise<void> {
  const calories = data.meals.reduce<number | null>((sum, m) => {
    if (m.calories == null) return sum;
    return (sum ?? 0) + m.calories;
  }, null);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(DIARY_STORE, "readwrite")
      .objectStore(DIARY_STORE)
      .put({ date, ...data, calories });
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

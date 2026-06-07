import { openDB, DIARY_STORE } from "../db";
import { type MealComponent } from "../types/MealComponent";
import { type Meal } from "../types/Meal";
import { type DiaryEntry } from "../types/DiaryEntry";

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
  data: { id?: string; weight: DiaryEntry["weight"]; meals: Array<Omit<Meal, "id" | "calories"> & { id?: string; components: Array<MealComponent & { id?: string }> }> },
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

export function cursorDiary(
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

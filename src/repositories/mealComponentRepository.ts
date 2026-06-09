import { DIARY_STORE, INGREDIENTS_STORE, openDB } from '../db';
import { type DiaryEntry } from '../types/DiaryEntry';
import { type Ingredient } from '../types/Ingredient';

/** Fetch meal component suggestions matching the given prefix (case-insensitive, up to 10). */
export async function getMealComponentSuggestions(
  query: string,
): Promise<{ id: string; name: string; caloriesPerUnit: number; unitsLabel?: string }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const lower = query.toLowerCase();
    const req = db
      .transaction(INGREDIENTS_STORE, 'readonly')
      .objectStore(INGREDIENTS_STORE)
      .getAll();
    req.onsuccess = () => {
      const all = req.result as {
        id?: string;
        name: string;
        nameLower?: string;
        caloriesPerUnit?: number;
        unitsLabel?: string;
      }[];
      const starts: typeof all = [];
      const contains: typeof all = [];
      for (const r of all) {
        const nl = r.nameLower ?? r.name.toLowerCase();
        if (nl.startsWith(lower)) starts.push(r);
        else if (nl.includes(lower)) contains.push(r);
      }
      resolve(
        [...starts, ...contains].slice(0, 10).map((r) => ({
          id: r.id ?? '',
          name: r.name,
          caloriesPerUnit: r.caloriesPerUnit ?? 0,
          unitsLabel: r.unitsLabel,
        })),
      );
    };
    req.onerror = () => reject(req.error);
  });
}

/** Return a meal component by its ID, or undefined if not found. */
export async function getMealComponentById(id: string): Promise<Ingredient | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(INGREDIENTS_STORE, 'readonly')
      .objectStore(INGREDIENTS_STORE)
      .get(id);
    req.onsuccess = () => resolve(req.result as Ingredient | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function getMealComponentByName(name: string): Promise<Ingredient | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(INGREDIENTS_STORE, 'readonly')
      .objectStore(INGREDIENTS_STORE)
      .index('by_name')
      .get(name);
    req.onsuccess = () => resolve(req.result as Ingredient | undefined);
    req.onerror = () => reject(req.error);
  });
}

/** Return all meal components sorted by name (case-insensitive). */
export async function getAllMealComponents(): Promise<Ingredient[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(INGREDIENTS_STORE, 'readonly')
      .objectStore(INGREDIENTS_STORE)
      .index('by_name_lower')
      .getAll();
    req.onsuccess = () => resolve(req.result as Ingredient[]);
    req.onerror = () => reject(req.error);
  });
}

/** Upsert a meal component into the mealComponents store */
export async function upsertIngredient(ingredient: Ingredient): Promise<void> {
  const db = await openDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(INGREDIENTS_STORE, 'readwrite');
    const req = tx.objectStore(INGREDIENTS_STORE).put(ingredient);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  await propagateMealComponentUpdate(db, ingredient);
}

/** Update all diary entries that contain components linked to the given meal component id. */
async function propagateMealComponentUpdate(
  db: IDBDatabase,
  ingredient: Ingredient,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIARY_STORE, 'readwrite');
    const store = tx.objectStore(DIARY_STORE);
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) {
        resolve();
        return;
      }
      const entry = cursor.value as DiaryEntry;
      let changed = false;
      for (const meal of entry.meals) {
        for (const comp of meal.components ?? []) {
          if (comp.ingredientId === ingredient.id) {
            comp.name = ingredient.name;
            if (comp.units != null) {
              comp.calories = Math.round((ingredient.caloriesPerUnit ?? 0) * comp.units);
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

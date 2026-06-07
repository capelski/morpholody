const DB_NAME = "morpholody";
const DB_VERSION = 9;
export const DIARY_STORE = "diary";
export const INGREDIENTS_STORE = "ingredients";

const LEGACY_MEAL_COMPONENTS_STORE = "mealComponents";

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = req.result;
        const tx = req.transaction!;

        if (e.oldVersion === 0) {
          // Fresh install — create all stores directly, no migration needed.
          db.createObjectStore(DIARY_STORE, { keyPath: "date" });
          const ingStore = db.createObjectStore(INGREDIENTS_STORE, { keyPath: "id" });
          ingStore.createIndex("by_name_lower", "nameLower");
          ingStore.createIndex("by_name", "name");
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
                const ingStore = db.createObjectStore(INGREDIENTS_STORE, { keyPath: "id" });
                ingStore.createIndex("by_name_lower", "nameLower");
                ingStore.createIndex("by_name", "name");
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
          const mcStore = db.createObjectStore(LEGACY_MEAL_COMPONENTS_STORE, { keyPath: "id" });
          mcStore.createIndex("by_name_lower", "nameLower");
          mcStore.createIndex("by_name", "name");
          return;
        }

        if (e.oldVersion === 4) {
          // v4 → v7: add nameLower index, back-fill, then recreate store keyed by id.
          // Fall through to the v5/v6 → v7 block below by not returning.
          const oldStore = tx.objectStore(LEGACY_MEAL_COMPONENTS_STORE);
          if (!oldStore.indexNames.contains("by_name_lower")) {
            oldStore.createIndex("by_name_lower", "nameLower");
          }
        }

        // v4/v5/v6 → v7: recreate mealComponents store keyed by id instead of name.
        // Back-fills nameLower and id on any records that predate those fields.
        if (e.oldVersion < 7) {
          const oldStore = tx.objectStore(LEGACY_MEAL_COMPONENTS_STORE);
          const allRecsReq = oldStore.getAll();
          allRecsReq.onsuccess = () => {
            const recs = allRecsReq.result as Array<Record<string, unknown>>;
            db.deleteObjectStore(LEGACY_MEAL_COMPONENTS_STORE);
            const newStore = db.createObjectStore(LEGACY_MEAL_COMPONENTS_STORE, { keyPath: "id" });
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

        // v8 → v9: rename mealComponents store to ingredients.
        if (e.oldVersion >= 7 && e.oldVersion < 9) {
          const allRecsReq = tx.objectStore(LEGACY_MEAL_COMPONENTS_STORE).getAll();
          allRecsReq.onsuccess = () => {
            const recs = allRecsReq.result as Array<Record<string, unknown>>;
            db.deleteObjectStore(LEGACY_MEAL_COMPONENTS_STORE);
            const ingStore = db.createObjectStore(INGREDIENTS_STORE, { keyPath: "id" });
            ingStore.createIndex("by_name_lower", "nameLower");
            ingStore.createIndex("by_name", "name");
            for (const rec of recs) ingStore.put(rec);
          };
          allRecsReq.onerror = () => reject(allRecsReq.error);
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

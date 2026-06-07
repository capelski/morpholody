export function applyVersion3(
  db: IDBDatabase,
  tx: IDBTransaction,
  e: IDBVersionChangeEvent,
  reject: (reason?: unknown) => void,
): boolean {
  if (e.oldVersion >= 3) return false;

  const diaryStore = db.createObjectStore('diary', { keyPath: 'date' });
  const diary = new Map<
    string,
    {
      date: string;
      weight: number | null;
      meals: Array<{ time: string; description: string }>;
    }
  >();

  const weightReq = tx.objectStore('weights').openCursor();
  weightReq.onsuccess = () => {
    const cursor = weightReq.result;
    if (cursor) {
      const date = cursor.key as string;
      diary.set(date, { date, weight: cursor.value as number, meals: [] });
      cursor.continue();
    } else {
      const flush = () => {
        for (const entry of diary.values()) {
          entry.meals.sort((a, b) => a.time.localeCompare(b.time));
          diaryStore.put(entry);
        }
        db.deleteObjectStore('weights');
        if (e.oldVersion >= 2) db.deleteObjectStore('meals');
        const ingStore = db.createObjectStore('ingredients', { keyPath: 'id' });
        ingStore.createIndex('by_name_lower', 'nameLower');
        ingStore.createIndex('by_name', 'name');
      };

      if (e.oldVersion >= 2) {
        const mealReq = tx.objectStore('meals').openCursor();
        mealReq.onsuccess = () => {
          const cursor = mealReq.result;
          if (cursor) {
            const {
              dateKey: dk,
              time,
              description,
            } = cursor.value as {
              dateKey: string;
              time: string;
              description: string;
            };
            if (!diary.has(dk)) diary.set(dk, { date: dk, weight: null, meals: [] });
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
  return true;
}

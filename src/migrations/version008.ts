export function applyVersion8(
  _db: IDBDatabase,
  tx: IDBTransaction,
  e: IDBVersionChangeEvent,
  reject: (reason?: unknown) => void,
): boolean {
  if (e.oldVersion >= 8) return false;

  const cursorReq = tx.objectStore("diary").openCursor();
  cursorReq.onsuccess = () => {
    const cursor = cursorReq.result;
    if (!cursor) return;
    const entry = cursor.value as Record<string, unknown>;
    if (!entry.id) entry.id = crypto.randomUUID();
    for (const meal of (entry.meals ?? []) as Array<Record<string, unknown>>) {
      if (!meal.id) meal.id = crypto.randomUUID();
      for (const comp of (meal.components ?? []) as Array<Record<string, unknown>>) {
        if (!comp.id) comp.id = crypto.randomUUID();
      }
    }
    cursor.update(entry);
    cursor.continue();
  };
  cursorReq.onerror = () => reject(cursorReq.error);
  return false;
}

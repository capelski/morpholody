export function applyVersion11(
  _db: IDBDatabase,
  tx: IDBTransaction,
  e: IDBVersionChangeEvent,
  reject: (reason?: unknown) => void,
  onDone: () => void,
): void {
  if (e.oldVersion < 10) {
    onDone();
    return;
  }

  const cursorReq = tx.objectStore('diary').openCursor();
  cursorReq.onsuccess = () => {
    const cursor = cursorReq.result;
    if (!cursor) {
      onDone();
      return;
    }
    const entry = cursor.value as Record<string, unknown>;
    let changed = false;
    for (const meal of (entry.meals ?? []) as Array<Record<string, unknown>>) {
      for (const comp of (meal.components ?? []) as Array<Record<string, unknown>>) {
        if ('quantity' in comp) {
          comp.units = comp.quantity;
          delete comp.quantity;
          changed = true;
        }
      }
    }
    if (changed) cursor.update(entry);
    cursor.continue();
  };
  cursorReq.onerror = () => reject(cursorReq.error);
}

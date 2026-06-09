export function applyVersion10(
  _db: IDBDatabase,
  tx: IDBTransaction,
  e: IDBVersionChangeEvent,
  reject: (reason?: unknown) => void,
): void {
  if (e.oldVersion < 9) return;

  const ingCursorReq = tx.objectStore('ingredients').openCursor();
  ingCursorReq.onsuccess = () => {
    const cursor = ingCursorReq.result;
    if (!cursor) return;
    const rec = cursor.value as Record<string, unknown>;
    if ('units' in rec) {
      rec.unitsLabel = rec.units;
      delete rec.units;
      cursor.update(rec);
    }
    cursor.continue();
  };
  ingCursorReq.onerror = () => reject(ingCursorReq.error);

  const diaryCursorReq = tx.objectStore('diary').openCursor();
  diaryCursorReq.onsuccess = () => {
    const cursor = diaryCursorReq.result;
    if (!cursor) return;
    const entry = cursor.value as Record<string, unknown>;
    let changed = false;
    for (const meal of (entry.meals ?? []) as Array<Record<string, unknown>>) {
      for (const comp of (meal.components ?? []) as Array<Record<string, unknown>>) {
        if ('units' in comp) {
          comp.unitsLabel = comp.units;
          delete comp.units;
          changed = true;
        }
      }
    }
    if (changed) cursor.update(entry);
    cursor.continue();
  };
  diaryCursorReq.onerror = () => reject(diaryCursorReq.error);
}

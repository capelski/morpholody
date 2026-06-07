export function applyVersion9(
  db: IDBDatabase,
  tx: IDBTransaction,
  e: IDBVersionChangeEvent,
  reject: (reason?: unknown) => void,
): boolean {
  if (e.oldVersion < 7 || e.oldVersion >= 9) return false;

  const allRecsReq = tx.objectStore('mealComponents').getAll();
  allRecsReq.onsuccess = () => {
    const recs = allRecsReq.result as Array<Record<string, unknown>>;
    db.deleteObjectStore('mealComponents');
    const ingStore = db.createObjectStore('ingredients', { keyPath: 'id' });
    ingStore.createIndex('by_name_lower', 'nameLower');
    ingStore.createIndex('by_name', 'name');
    for (const rec of recs) ingStore.put(rec);
  };
  allRecsReq.onerror = () => reject(allRecsReq.error);
  return false;
}

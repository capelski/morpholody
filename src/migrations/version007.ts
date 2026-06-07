export function applyVersion7(
  db: IDBDatabase,
  tx: IDBTransaction,
  e: IDBVersionChangeEvent,
  reject: (reason?: unknown) => void,
): boolean {
  if (e.oldVersion >= 7) return false;

  if (e.oldVersion === 4) {
    const oldStore = tx.objectStore('mealComponents');
    if (!oldStore.indexNames.contains('by_name_lower')) {
      oldStore.createIndex('by_name_lower', 'nameLower');
    }
  }

  const oldStore = tx.objectStore('mealComponents');
  const allRecsReq = oldStore.getAll();
  allRecsReq.onsuccess = () => {
    const recs = allRecsReq.result as Array<Record<string, unknown>>;
    db.deleteObjectStore('mealComponents');
    const newStore = db.createObjectStore('mealComponents', { keyPath: 'id' });
    newStore.createIndex('by_name_lower', 'nameLower');
    newStore.createIndex('by_name', 'name');
    for (const rec of recs) {
      if (!rec.id) rec.id = crypto.randomUUID();
      if (!rec.nameLower) rec.nameLower = (rec.name as string).toLowerCase();
      newStore.put(rec);
    }
  };
  allRecsReq.onerror = () => reject(allRecsReq.error);
  return false;
}

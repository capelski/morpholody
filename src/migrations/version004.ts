export function applyVersion4(
  db: IDBDatabase,
  _tx: IDBTransaction,
  e: IDBVersionChangeEvent,
  _reject: (reason?: unknown) => void,
): boolean {
  if (e.oldVersion !== 3) return false;

  const mcStore = db.createObjectStore("mealComponents", { keyPath: "id" });
  mcStore.createIndex("by_name_lower", "nameLower");
  mcStore.createIndex("by_name", "name");
  return true;
}

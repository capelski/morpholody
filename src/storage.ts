const DB_NAME = "morpholody";
const DB_VERSION = 1;
const STORE = "weights";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function getWeight(date: Date): Promise<number | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(STORE, "readonly")
      .objectStore(STORE)
      .get(dateKey(date));
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function setWeight(date: Date, weight: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(STORE, "readwrite")
      .objectStore(STORE)
      .put(weight, dateKey(date));
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export interface WeightEntry {
  dateKey: string; // YYYY-MM-DD
  weight: number;
}

function cursorEntries(
  store: IDBObjectStore,
  range?: IDBKeyRange,
): Promise<WeightEntry[]> {
  return new Promise((resolve, reject) => {
    const req = store.openCursor(range);
    const entries: WeightEntry[] = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        entries.push({ dateKey: cursor.key as string, weight: cursor.value });
        cursor.continue();
      } else {
        resolve(entries);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getWeightEntriesForMonth(
  year: number,
  month: number,
): Promise<WeightEntry[]> {
  const db = await openDB();
  const m = String(month).padStart(2, "0");
  const range = IDBKeyRange.bound(`${year}-${m}-01`, `${year}-${m}-31`);
  return cursorEntries(
    db.transaction(STORE, "readonly").objectStore(STORE),
    range,
  );
}

export async function getDaysWithWeightInMonth(
  year: number,
  month: number,
): Promise<Set<number>> {
  const entries = await getWeightEntriesForMonth(year, month);
  return new Set(entries.map((e) => parseInt(e.dateKey.split("-")[2], 10)));
}

export async function getAllWeightEntries(): Promise<WeightEntry[]> {
  const db = await openDB();
  const entries = await cursorEntries(
    db.transaction(STORE, "readonly").objectStore(STORE),
  );
  entries.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return entries;
}

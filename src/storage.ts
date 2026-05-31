const DB_NAME = "morpholody";
const DB_VERSION = 2;
const WEIGHTS_STORE = "weights";
const MEALS_STORE = "meals";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = req.result;
        if (e.oldVersion < 1) db.createObjectStore(WEIGHTS_STORE);
        if (e.oldVersion < 2) db.createObjectStore(MEALS_STORE);
      };
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
      .transaction(WEIGHTS_STORE, "readonly")
      .objectStore(WEIGHTS_STORE)
      .get(dateKey(date));
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function setWeight(date: Date, weight: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(WEIGHTS_STORE, "readwrite")
      .objectStore(WEIGHTS_STORE)
      .put(weight, dateKey(date));
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export interface WeightEntry {
  dateKey: string; // YYYY-MM-DD
  weight: number;
}

export interface Meal {
  dateKey: string; // YYYY-MM-DD
  time: string; // HH:MM
  description: string;
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
    db.transaction(WEIGHTS_STORE, "readonly").objectStore(WEIGHTS_STORE),
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
    db.transaction(WEIGHTS_STORE, "readonly").objectStore(WEIGHTS_STORE),
  );
  entries.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return entries;
}

export async function getMealsForDate(date: Date): Promise<Meal[]> {
  const db = await openDB();
  const dk = dateKey(date);
  const range = IDBKeyRange.bound(`${dk} 00:00`, `${dk} 23:59`);
  return new Promise((resolve, reject) => {
    const store = db
      .transaction(MEALS_STORE, "readonly")
      .objectStore(MEALS_STORE);
    const req = store.openCursor(range);
    const meals: Meal[] = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        meals.push(cursor.value as Meal);
        cursor.continue();
      } else {
        resolve(meals);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveMealsForDate(
  date: Date,
  meals: Array<{ time: string; description: string }>,
): Promise<void> {
  const db = await openDB();
  const dk = dateKey(date);
  const range = IDBKeyRange.bound(`${dk} 00:00`, `${dk} 23:59`);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEALS_STORE, "readwrite");
    const store = tx.objectStore(MEALS_STORE);
    const req = store.delete(range);
    req.onsuccess = () => {
      meals.forEach(({ time, description }) => {
        store.put({ dateKey: dk, time, description }, `${dk} ${time}`);
      });
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

import { collection, doc, writeBatch, type Firestore } from 'firebase/firestore';
import { db } from '../firebase';

const MIGRATION_KEY = 'idb_migrated_v1';
const DB_NAME = 'morpholody';
const DB_VERSION = 12;

function openIdb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
    // If the DB doesn't exist yet, onupgradeneeded fires — we don't want to create it
    req.onupgradeneeded = () => {
      req.transaction?.abort();
      resolve(null);
    };
  });
}

function readAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(storeName)) {
      resolve([]);
      return;
    }
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

/**
 * One-time migration from IndexedDB to Firestore.
 * Runs only if the migration flag isn't set in localStorage.
 * Safe to call on every app start — exits immediately if already done.
 */
export async function migrateFromIdb(uid: string): Promise<void> {
  if (localStorage.getItem(MIGRATION_KEY) === uid) return;

  const idb = await openIdb();
  if (!idb) {
    // No IDB database — nothing to migrate, mark done.
    localStorage.setItem(MIGRATION_KEY, uid);
    return;
  }

  const [diary, ingredients] = await Promise.all([
    readAll<Record<string, unknown>>(idb, 'diary'),
    readAll<Record<string, unknown>>(idb, 'ingredients'),
  ]);
  idb.close();

  if (diary.length === 0 && ingredients.length === 0) {
    localStorage.setItem(MIGRATION_KEY, uid);
    return;
  }

  // Firestore batch writes are capped at 500 docs each
  const all: Array<{ col: string; id: string; data: Record<string, unknown> }> = [
    ...diary.map((e) => ({ col: 'diary', id: e.date as string, data: e })),
    ...ingredients.map((e) => ({ col: 'ingredients', id: e.id as string, data: e })),
  ];

  for (let i = 0; i < all.length; i += 500) {
    const batch = writeBatch(db);
    for (const item of all.slice(i, i + 500)) {
      batch.set(doc(collection(db as Firestore, 'users', uid, item.col), item.id), item.data);
    }
    await batch.commit();
  }

  localStorage.setItem(MIGRATION_KEY, uid);
}

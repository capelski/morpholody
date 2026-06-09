import { applyVersion3 } from './migrations/version003';
import { applyVersion4 } from './migrations/version004';
import { applyVersion7 } from './migrations/version007';
import { applyVersion8 } from './migrations/version008';
import { applyVersion9 } from './migrations/version009';
import { applyVersion10 } from './migrations/version010';
import { applyVersion11 } from './migrations/version011';
import { applyVersion12 } from './migrations/version012';

const DB_NAME = 'morpholody';
const DB_VERSION = 12;
export const DIARY_STORE = 'diary';
export const INGREDIENTS_STORE = 'ingredients';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = req.result;
        const tx = req.transaction!;

        if (e.oldVersion === 0) {
          db.createObjectStore(DIARY_STORE, { keyPath: 'date' });
          const ingStore = db.createObjectStore(INGREDIENTS_STORE, {
            keyPath: 'id',
          });
          ingStore.createIndex('by_name_lower', 'nameLower');
          ingStore.createIndex('by_name', 'name');
          return;
        }

        if (applyVersion3(db, tx, e, reject)) return;
        if (applyVersion4(db, tx, e, reject)) return;
        applyVersion7(db, tx, e, reject);
        applyVersion8(db, tx, e, reject);
        applyVersion9(db, tx, e, reject);
        applyVersion10(db, tx, e, reject);
        applyVersion11(db, tx, e, reject);
        applyVersion12(db, tx, e, reject);
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

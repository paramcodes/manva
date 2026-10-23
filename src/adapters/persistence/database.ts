import { openDB, type IDBPDatabase } from 'idb';

export const DB_NAME = 'manva_studio_db';
export const DB_VERSION = 1;

let sharedDbPromise: Promise<IDBPDatabase> | null = null;

export function getSharedDatabase(): Promise<IDBPDatabase> {
  if (!sharedDbPromise) {
    sharedDbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('designs')) {
          db.createObjectStore('designs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('assets_meta')) {
          db.createObjectStore('assets_meta', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('assets_blobs')) {
          db.createObjectStore('assets_blobs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('shares')) {
          const store = db.createObjectStore('shares', { keyPath: 'token' });
          store.createIndex('by_design', 'designId');
        }
      },
    });
  }
  return sharedDbPromise;
}

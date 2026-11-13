export const DB_NAME = 'wasteless_db_v1';
export const DB_VERSION = 2;

export const STORES = {
  MENU_ITEMS: 'menu_items',
  INGREDIENTS: 'ingredients',
  SALES_RECORDS: 'sales_records',
  WASTE_RECORDS: 'waste_records',
  STOCK_MOVEMENTS: 'stock_movements',
  CLOSED_DAYS: 'closed_days',
  PREP_CHECKLISTS: 'prep_checklists',
  PREP_OVERRIDES: 'prep_overrides',
  CONTEXTUAL_CACHE: 'contextual_cache',
  SETTINGS: 'settings'
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

const memoryFallback = new Map<string, Map<string, unknown>>();

function getMemoryStore(storeName: string): Map<string, unknown> {
  if (!memoryFallback.has(storeName)) {
    memoryFallback.set(storeName, new Map<string, unknown>());
  }
  return memoryFallback.get(storeName)!;
}

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined';
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (!hasIndexedDB()) {
    return Promise.reject(new Error('IndexedDB unavailable in current runtime.'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      Object.values(STORES).forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          if (storeName === STORES.PREP_CHECKLISTS) {
            store.createIndex('prepSheetId', 'prepSheetId', { unique: false });
          }
          if (storeName === STORES.SALES_RECORDS) {
            store.createIndex('date', 'date', { unique: false });
          }
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };
  });

  return dbPromise;
}

export async function idbGetAll<T>(storeName: StoreName): Promise<T[]> {
  if (!hasIndexedDB()) {
    return Array.from(getMemoryStore(storeName).values()) as T[];
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []) as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet<T>(storeName: StoreName, id: string): Promise<T | null> {
  if (!hasIndexedDB()) {
    return (getMemoryStore(storeName).get(id) as T) || null;
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as T) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut<T extends { id: string }>(storeName: StoreName, item: T): Promise<void> {
  if (!hasIndexedDB()) {
    getMemoryStore(storeName).set(item.id, item);
    return;
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbPutMany<T extends { id: string }>(storeName: StoreName, items: T[]): Promise<void> {
  if (!hasIndexedDB()) {
    const mem = getMemoryStore(storeName);
    items.forEach(item => mem.set(item.id, item));
    return;
  }
  if (items.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    items.forEach(item => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDelete(storeName: StoreName, id: string): Promise<void> {
  if (!hasIndexedDB()) {
    getMemoryStore(storeName).delete(id);
    return;
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbClearStore(storeName: StoreName): Promise<void> {
  if (!hasIndexedDB()) {
    getMemoryStore(storeName).clear();
    return;
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbClearAllStores(): Promise<void> {
  await Promise.all(Object.values(STORES).map(s => idbClearStore(s)));
}

export const DB_NAME = 'wasteless_db_v1';
export const DB_VERSION = 1;

export type StoreName =
  | 'restaurants'
  | 'ingredients'
  | 'menu_items'
  | 'inventory_records'
  | 'sales_records'
  | 'waste_records'
  | 'predictions'
  | 'prep_sheets'
  | 'prep_checklists'
  | 'settings';

const ALL_STORES: StoreName[] = [
  'restaurants',
  'ingredients',
  'menu_items',
  'inventory_records',
  'sales_records',
  'waste_records',
  'predictions',
  'prep_sheets',
  'prep_checklists',
  'settings'
];

const memoryFallback = new Map<StoreName, Map<string, unknown>>();
for (const store of ALL_STORES) {
  memoryFallback.set(store, new Map<string, unknown>());
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB unavailable in this environment'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('restaurants')) {
        db.createObjectStore('restaurants', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('ingredients')) {
        const store = db.createObjectStore('ingredients', { keyPath: 'id' });
        store.createIndex('restaurantId', 'restaurantId', { unique: false });
      }
      if (!db.objectStoreNames.contains('menu_items')) {
        const store = db.createObjectStore('menu_items', { keyPath: 'id' });
        store.createIndex('restaurantId', 'restaurantId', { unique: false });
        store.createIndex('station', 'station', { unique: false });
      }
      if (!db.objectStoreNames.contains('inventory_records')) {
        const store = db.createObjectStore('inventory_records', { keyPath: 'id' });
        store.createIndex('restaurantId', 'restaurantId', { unique: false });
        store.createIndex('ingredientId', 'ingredientId', { unique: false });
      }
      if (!db.objectStoreNames.contains('sales_records')) {
        const store = db.createObjectStore('sales_records', { keyPath: 'id' });
        store.createIndex('restaurantId', 'restaurantId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('menuItemId', 'menuItemId', { unique: false });
      }
      if (!db.objectStoreNames.contains('waste_records')) {
        const store = db.createObjectStore('waste_records', { keyPath: 'id' });
        store.createIndex('restaurantId', 'restaurantId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('predictions')) {
        const store = db.createObjectStore('predictions', { keyPath: 'id' });
        store.createIndex('restaurantId', 'restaurantId', { unique: false });
        store.createIndex('targetDate', 'targetDate', { unique: false });
      }
      if (!db.objectStoreNames.contains('prep_sheets')) {
        const store = db.createObjectStore('prep_sheets', { keyPath: 'id' });
        store.createIndex('restaurantId', 'restaurantId', { unique: false });
        store.createIndex('businessDate', 'businessDate', { unique: false });
      }
      if (!db.objectStoreNames.contains('prep_checklists')) {
        const store = db.createObjectStore('prep_checklists', { keyPath: 'id' });
        store.createIndex('prepSheetId', 'prepSheetId', { unique: false });
        store.createIndex('businessDate', 'businessDate', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });

  return dbPromise;
}

export async function idbGetAll<T>(storeName: StoreName): Promise<T[]> {
  if (!isIndexedDbAvailable()) {
    return Array.from(memoryFallback.get(storeName)!.values()) as T[];
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

export async function idbGetById<T>(storeName: StoreName, id: string): Promise<T | null> {
  if (!isIndexedDbAvailable()) {
    return (memoryFallback.get(storeName)!.get(id) as T) || null;
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

export async function idbPut<T extends { id: string }>(storeName: StoreName, value: T): Promise<void> {
  if (!isIndexedDbAvailable()) {
    memoryFallback.get(storeName)!.set(value.id, value);
    return;
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbPutBulk<T extends { id: string }>(storeName: StoreName, values: T[]): Promise<void> {
  if (values.length === 0) return;
  if (!isIndexedDbAvailable()) {
    const map = memoryFallback.get(storeName)!;
    for (const v of values) {
      map.set(v.id, v);
    }
    return;
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const v of values) {
      store.put(v);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDelete(storeName: StoreName, id: string): Promise<void> {
  if (!isIndexedDbAvailable()) {
    memoryFallback.get(storeName)!.delete(id);
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

export async function idbClear(storeName: StoreName): Promise<void> {
  if (!isIndexedDbAvailable()) {
    memoryFallback.get(storeName)!.clear();
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

export async function idbClearAll(): Promise<void> {
  for (const store of ALL_STORES) {
    await idbClear(store);
  }
}

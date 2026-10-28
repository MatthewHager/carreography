// A tiny key-value store in IndexedDB, for files the browser keeps between visits (Tesla's car
// models, which the site can't host).

const DB = 'carreography';
const STORE = 'files';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export const getFile = (key: string) => run<ArrayBuffer | undefined>('readonly', (s) => s.get(key));
export const putFile = (key: string, data: ArrayBuffer) => run('readwrite', (s) => s.put(data, key));
export const deleteFile = (key: string) => run('readwrite', (s) => s.delete(key));

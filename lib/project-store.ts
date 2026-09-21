export type StoredProject = {
  id: string;
  name: string;
  savedAt: string;
  moleculeCount: number;
  selectedCount: number;
  payload: Record<string, unknown>;
};

const DB_NAME = 'pocket-atlas-projects';
const STORE = 'projects';

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE))
        db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await database();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(tx.error || Error('项目保存事务中断'));
    };
  });
}

export async function putProject(project: StoredProject) {
  await transact('readwrite', (store) => store.put(project));
}

export async function getProject(id: string) {
  return transact<StoredProject | undefined>('readonly', (store) =>
    store.get(id),
  );
}

export async function listProjects() {
  const projects = await transact<StoredProject[]>('readonly', (store) =>
    store.getAll(),
  );
  return projects.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const localStorageAdapter: StorageAdapter = {
  getItem: (key) =>
    typeof localStorage === 'undefined' ? null : localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

export function commitLocalRecords(
  storage: StorageAdapter,
  records: Record<string, string>,
) {
  const previous = Object.keys(records).map(
    (key) => [key, storage.getItem(key)] as const,
  );
  try {
    Object.entries(records).forEach(([key, value]) =>
      storage.setItem(key, value),
    );
  } catch (error) {
    previous.reverse().forEach(([key, value]) => {
      if (storage.getItem(key) === value) return;
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    });
    throw error;
  }
}

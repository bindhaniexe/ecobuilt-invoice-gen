/**
 * Client-side sync bookkeeping persisted alongside the data in Storage.
 *
 * - Per-collection "dirty" id sets: records mutated locally since the last
 *   successful push. These are the records we send up on the next sync.
 * - A `cursor`: the server-clock watermark returned by the last sync, used to
 *   pull only records changed by other devices since then.
 */

const SYNC_KEYS = {
  dirtyCustomers: "invoice-gen:v1:sync:dirty-customers",
  dirtyInvoices: "invoice-gen:v1:sync:dirty-invoices",
  cursor: "invoice-gen:v1:sync:cursor",
};

export type SyncCollection = "customers" | "invoices";

function dirtyKey(collection: SyncCollection): string {
  return collection === "customers"
    ? SYNC_KEYS.dirtyCustomers
    : SYNC_KEYS.dirtyInvoices;
}

function readIdSet(storage: Storage, key: string): Set<string> {
  const raw = storage.getItem(key);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function writeIdSet(storage: Storage, key: string, ids: Set<string>): void {
  storage.setItem(key, JSON.stringify([...ids]));
}

/** Mark a record as needing to be pushed on the next sync. */
export function markDirty(
  storage: Storage,
  collection: SyncCollection,
  id: string,
): void {
  const key = dirtyKey(collection);
  const ids = readIdSet(storage, key);
  ids.add(id);
  writeIdSet(storage, key, ids);
}

export function getDirtyIds(
  storage: Storage,
  collection: SyncCollection,
): Set<string> {
  return readIdSet(storage, dirtyKey(collection));
}

/**
 * Clear the given ids from the dirty set after a successful push. Ids added
 * again during the in-flight sync (edited mid-request) are preserved so they
 * push on the next cycle.
 */
export function clearDirty(
  storage: Storage,
  collection: SyncCollection,
  syncedIds: Iterable<string>,
): void {
  const key = dirtyKey(collection);
  const ids = readIdSet(storage, key);
  for (const id of syncedIds) ids.delete(id);
  writeIdSet(storage, key, ids);
}

export function getCursor(storage: Storage): string | null {
  return storage.getItem(SYNC_KEYS.cursor);
}

export function setCursor(storage: Storage, cursor: string): void {
  storage.setItem(SYNC_KEYS.cursor, cursor);
}

/** Wipe all sync bookkeeping (used when local storage is reset). */
export function clearSyncState(storage: Storage): void {
  storage.removeItem(SYNC_KEYS.dirtyCustomers);
  storage.removeItem(SYNC_KEYS.dirtyInvoices);
  storage.removeItem(SYNC_KEYS.cursor);
}

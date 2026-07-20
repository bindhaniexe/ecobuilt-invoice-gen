import {
  emitDataChanged,
  readCustomers,
  readInvoices,
  writeCustomers,
  writeInvoices,
} from "@/domain/storage/collection-store";
import type { Customer, Invoice } from "@/domain/invoices/types";

import { syncPullSchema, type SyncPush } from "./types";

const SYNC_ENDPOINT = "/api/sync";
const SEED_FLAG_KEY = "invoice-gen:v1:sync:seeded";

export type SyncResult =
  | { status: "ok" }
  | { status: "disabled" }
  | { status: "error"; message: string };

/** Records with a matching id, keeping whichever has the newer updatedAt. */
function mergeById<T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[],
): { merged: T[]; changed: boolean } {
  const byId = new Map(local.map((record) => [record.id, record]));
  let changed = false;

  for (const incoming of remote) {
    const current = byId.get(incoming.id);
    if (
      !current ||
      new Date(incoming.updatedAt).getTime() >
        new Date(current.updatedAt).getTime()
    ) {
      byId.set(incoming.id, incoming);
      changed = true;
    }
  }

  return { merged: [...byId.values()], changed };
}

/** Pull the full dataset and merge it into local storage (last-write-wins). */
export async function pullAll(storage: Storage): Promise<SyncResult> {
  let response: Response;
  try {
    response = await fetch(SYNC_ENDPOINT, { method: "GET" });
  } catch (error) {
    return { status: "error", message: (error as Error).message };
  }

  if (response.status === 503) return { status: "disabled" };
  if (!response.ok) {
    return { status: "error", message: `Pull failed (${response.status})` };
  }

  let pull;
  try {
    pull = syncPullSchema.parse(await response.json());
  } catch (error) {
    return { status: "error", message: (error as Error).message };
  }

  const customerMerge = mergeById<Customer>(readCustomers(storage), pull.customers);
  const invoiceMerge = mergeById<Invoice>(readInvoices(storage), pull.invoices);

  if (customerMerge.changed) writeCustomers(storage, customerMerge.merged);
  if (invoiceMerge.changed) writeInvoices(storage, invoiceMerge.merged);

  // Note: merges deliberately do NOT emit a local-mutation, so a pull never
  // triggers a push. They emit data-changed so the UI refreshes.
  if (customerMerge.changed || invoiceMerge.changed) emitDataChanged();

  return { status: "ok" };
}

/** Push the given records to the server (upserted with last-write-wins). */
export async function pushRecords(push: SyncPush): Promise<SyncResult> {
  if (!push.customers.length && !push.invoices.length) return { status: "ok" };

  let response: Response;
  try {
    response = await fetch(SYNC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(push),
    });
  } catch (error) {
    return { status: "error", message: (error as Error).message };
  }

  if (response.status === 503) return { status: "disabled" };
  if (!response.ok) {
    return { status: "error", message: `Push failed (${response.status})` };
  }

  return { status: "ok" };
}

/**
 * One-time migration: push every record already in local storage (from before
 * sync existed) up to the server. Runs once per browser, tracked by a flag.
 */
export async function seedOnce(storage: Storage): Promise<SyncResult> {
  if (storage.getItem(SEED_FLAG_KEY)) return { status: "ok" };

  const result = await pushRecords({
    customers: readCustomers(storage),
    invoices: readInvoices(storage),
  });

  // Only mark seeded when the server actually accepted the data. If sync is
  // disabled we leave the flag unset so seeding retries once it's configured.
  if (result.status === "ok") storage.setItem(SEED_FLAG_KEY, "1");
  return result;
}

export function clearSeedFlag(storage: Storage): void {
  storage.removeItem(SEED_FLAG_KEY);
}

import {
  emitDataChanged,
  readCustomers,
  readInvoices,
  writeCustomers,
  writeInvoices,
} from "@/domain/storage/collection-store";
import type { Customer, Invoice } from "@/domain/invoices/types";

import {
  syncResponseSchema,
  type SyncRequest,
  type SyncResponse,
} from "./types";
import {
  clearDirty,
  getCursor,
  getDirtyIds,
  setCursor,
} from "./sync-state";

const SYNC_ENDPOINT = "/api/sync";

export type SyncOutcome =
  | { status: "ok"; pulled: number; pushed: number }
  | { status: "offline" }
  | { status: "disabled" }
  | { status: "unauthorized" }
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

function collectDirty<T extends { id: string }>(
  records: T[],
  dirtyIds: Set<string>,
): T[] {
  return records.filter((record) => dirtyIds.has(record.id));
}

/**
 * Run one full sync cycle against the server: push locally-dirty records
 * (including tombstones) and merge back everything changed elsewhere.
 *
 * Offline-safe: a network failure leaves local data and the dirty sets intact
 * so the changes retry on the next cycle. Returns a coarse outcome for the UI.
 */
export async function runSync(storage: Storage): Promise<SyncOutcome> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { status: "offline" };
  }

  const dirtyCustomerIds = getDirtyIds(storage, "customers");
  const dirtyInvoiceIds = getDirtyIds(storage, "invoices");

  const localCustomers = readCustomers(storage);
  const localInvoices = readInvoices(storage);

  const payload: SyncRequest = {
    cursor: getCursor(storage),
    customers: collectDirty(localCustomers, dirtyCustomerIds),
    invoices: collectDirty(localInvoices, dirtyInvoiceIds),
  };

  let response: Response;
  try {
    response = await fetch(SYNC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { status: "offline" };
  }

  if (response.status === 503) {
    // Server has no DATABASE_URL configured — sync is disabled.
    return { status: "disabled" };
  }

  if (response.status === 401) {
    // Session missing/expired or signed with an old AUTH_SECRET. The user needs
    // to sign in again to get a valid cookie.
    return { status: "unauthorized" };
  }

  if (!response.ok) {
    return {
      status: "error",
      message: `Sync failed with status ${response.status}`,
    };
  }

  let parsed: SyncResponse;
  try {
    parsed = syncResponseSchema.parse(await response.json());
  } catch (error) {
    return { status: "error", message: (error as Error).message };
  }

  // Merge pulled records (LWW) into the freshest local snapshot. Re-read in
  // case the user mutated data during the request.
  const customerMerge = mergeById<Customer>(
    readCustomers(storage),
    parsed.customers,
  );
  const invoiceMerge = mergeById<Invoice>(
    readInvoices(storage),
    parsed.invoices,
  );

  if (customerMerge.changed) writeCustomers(storage, customerMerge.merged);
  if (invoiceMerge.changed) writeInvoices(storage, invoiceMerge.merged);

  // The pushed records are now on the server: clear them from the dirty sets.
  // Ids re-dirtied mid-request are preserved for the next cycle.
  clearDirty(storage, "customers", dirtyCustomerIds);
  clearDirty(storage, "invoices", dirtyInvoiceIds);

  setCursor(storage, parsed.cursor);

  if (customerMerge.changed || invoiceMerge.changed) emitDataChanged();

  return {
    status: "ok",
    pulled: parsed.customers.length + parsed.invoices.length,
    pushed: payload.customers.length + payload.invoices.length,
  };
}

import { z } from "zod";

import {
  customerListSchema,
  invoiceListSchema,
} from "@/domain/invoices/schemas";
import type { Customer, Invoice } from "@/domain/invoices/types";

import { LocalStorageCorruptionError } from "./errors";

/**
 * Low-level access to the raw record collections in Storage. Both the
 * repositories (which filter tombstones for the UI) and the sync engine (which
 * needs the tombstones to push deletes) build on these helpers so the storage
 * keys and (de)serialization never drift.
 */

export const STORAGE_KEYS = {
  invoices: "invoice-gen:v1:invoices",
  customers: "invoice-gen:v1:customers",
} as const;

/** Emitted after any local mutation or sync merge so UI hooks can refresh. */
export const DATA_CHANGED_EVENT = "invoice-gen:data-changed";

export function emitDataChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
}

export function sortByUpdatedAt<T extends { updatedAt: string }>(
  records: T[],
): T[] {
  return [...records].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function readCollection<T>(
  storage: Storage,
  key: string,
  schema: z.ZodType<T[]>,
): T[] {
  const raw = storage.getItem(key);
  if (!raw) return [];

  try {
    return schema.parse(JSON.parse(raw));
  } catch (error) {
    throw new LocalStorageCorruptionError(key, error);
  }
}

export function writeCollection<T>(
  storage: Storage,
  key: string,
  records: T[],
): void {
  storage.setItem(key, JSON.stringify(records));
}

export function includesQuery(values: string[], query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return values.some((value) => value.toLowerCase().includes(normalizedQuery));
}

/** True when a record is live (not soft-deleted). */
export function isLive<T extends { deletedAt?: string }>(record: T): boolean {
  return !record.deletedAt;
}

export function readCustomers(storage: Storage): Customer[] {
  return readCollection(storage, STORAGE_KEYS.customers, customerListSchema);
}

export function readInvoices(storage: Storage): Invoice[] {
  return readCollection(storage, STORAGE_KEYS.invoices, invoiceListSchema);
}

export function writeCustomers(storage: Storage, records: Customer[]): void {
  writeCollection(storage, STORAGE_KEYS.customers, records);
}

export function writeInvoices(storage: Storage, records: Invoice[]): void {
  writeCollection(storage, STORAGE_KEYS.invoices, records);
}

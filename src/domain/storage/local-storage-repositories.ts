import { z } from "zod";

import {
  customerListSchema,
  invoiceListSchema,
} from "@/domain/invoices/schemas";
import type {
  Customer,
  CustomerRepository,
  InvoiceFilters,
  InvoiceRepository,
} from "@/domain/invoices/types";

import { LocalStorageCorruptionError } from "./errors";

const STORAGE_KEYS = {
  invoices: "invoice-gen:v1:invoices",
  customers: "invoice-gen:v1:customers",
};

function sortByUpdatedAt<T extends { updatedAt: string }>(records: T[]): T[] {
  return [...records].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function readCollection<T>(
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

function writeCollection<T>(storage: Storage, key: string, records: T[]): void {
  storage.setItem(key, JSON.stringify(records));
}

function includesQuery(values: string[], query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return values.some((value) => value.toLowerCase().includes(normalizedQuery));
}

export function createLocalStorageCustomerRepository(
  storage: Storage,
): CustomerRepository {
  const key = STORAGE_KEYS.customers;

  return {
    async list() {
      return sortByUpdatedAt(readCollection(storage, key, customerListSchema));
    },
    async getById(id) {
      return (await this.list()).find((customer) => customer.id === id) ?? null;
    },
    async create(customer) {
      const now = new Date().toISOString();
      const record: Customer = {
        ...customer,
        id: `cus_${crypto.randomUUID()}`,
        createdAt: now,
        updatedAt: now,
      };
      const records = readCollection(storage, key, customerListSchema);
      writeCollection(storage, key, [record, ...records]);
      return record;
    },
    async update(id, customer) {
      const records = readCollection(storage, key, customerListSchema);
      const current = records.find((record) => record.id === id);

      if (!current) throw new Error("Customer not found");

      const updated: Customer = {
        ...current,
        ...customer,
        updatedAt: new Date().toISOString(),
      };
      writeCollection(
        storage,
        key,
        records.map((record) => (record.id === id ? updated : record)),
      );
      return updated;
    },
    async delete(id) {
      const records = readCollection(storage, key, customerListSchema);
      writeCollection(
        storage,
        key,
        records.filter((record) => record.id !== id),
      );
    },
    async search(query) {
      const records = await this.list();
      return records.filter((customer) =>
        includesQuery(
          [
            customer.name,
            customer.address,
            customer.gstNumber,
            customer.phone,
            customer.email,
          ],
          query,
        ),
      );
    },
    async reset() {
      storage.removeItem(key);
    },
  };
}

export function createLocalStorageInvoiceRepository(
  storage: Storage,
): InvoiceRepository {
  const key = STORAGE_KEYS.invoices;

  return {
    async list() {
      return sortByUpdatedAt(readCollection(storage, key, invoiceListSchema));
    },
    async getById(id) {
      return (await this.list()).find((invoice) => invoice.id === id) ?? null;
    },
    async create(invoice) {
      const records = readCollection(storage, key, invoiceListSchema);
      writeCollection(storage, key, [invoice, ...records]);
      return invoice;
    },
    async update(id, invoice) {
      const records = readCollection(storage, key, invoiceListSchema);
      if (!records.some((record) => record.id === id)) {
        throw new Error("Invoice not found");
      }
      writeCollection(
        storage,
        key,
        records.map((record) => (record.id === id ? invoice : record)),
      );
      return invoice;
    },
    async delete(id) {
      const records = readCollection(storage, key, invoiceListSchema);
      writeCollection(
        storage,
        key,
        records.filter((record) => record.id !== id),
      );
    },
    async search(filters: InvoiceFilters) {
      const records = await this.list();
      return records.filter((invoice) => {
        const statusMatch =
          !filters.status ||
          filters.status === "all" ||
          invoice.paymentStatus === filters.status;
        const queryMatch = includesQuery(
          [
            invoice.invoiceNumber,
            invoice.customerSnapshot.name,
            invoice.customerSnapshot.gstNumber,
            invoice.company.name,
          ],
          filters.query ?? "",
        );

        return statusMatch && queryMatch;
      });
    },
    async reset() {
      storage.removeItem(key);
    },
  };
}

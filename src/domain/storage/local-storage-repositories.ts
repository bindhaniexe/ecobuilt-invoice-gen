import type {
  Customer,
  CustomerRepository,
  Invoice,
  InvoiceFilters,
  InvoiceRepository,
} from "@/domain/invoices/types";
import { markDirty, clearSyncState } from "@/domain/sync/sync-state";

import {
  STORAGE_KEYS,
  emitDataChanged,
  includesQuery,
  isLive,
  readCustomers,
  readInvoices,
  sortByUpdatedAt,
  writeCustomers,
  writeInvoices,
} from "./collection-store";

export function createLocalStorageCustomerRepository(
  storage: Storage,
): CustomerRepository {
  function persist(records: Customer[], dirtyId: string): void {
    writeCustomers(storage, records);
    markDirty(storage, "customers", dirtyId);
    emitDataChanged();
  }

  return {
    async list() {
      return sortByUpdatedAt(readCustomers(storage).filter(isLive));
    },
    async getById(id) {
      const record = readCustomers(storage).find((item) => item.id === id);
      return record && isLive(record) ? record : null;
    },
    async create(customer) {
      const now = new Date().toISOString();
      const record: Customer = {
        ...customer,
        id: `cus_${crypto.randomUUID()}`,
        createdAt: now,
        updatedAt: now,
      };
      persist([record, ...readCustomers(storage)], record.id);
      return record;
    },
    async update(id, customer) {
      const records = readCustomers(storage);
      const current = records.find((record) => record.id === id);

      if (!current || !isLive(current)) throw new Error("Customer not found");

      const updated: Customer = {
        ...current,
        ...customer,
        updatedAt: new Date().toISOString(),
      };
      persist(
        records.map((record) => (record.id === id ? updated : record)),
        id,
      );
      return updated;
    },
    async delete(id) {
      const records = readCustomers(storage);
      const current = records.find((record) => record.id === id);
      if (!current) return;

      // Soft-delete: keep a tombstone so the deletion syncs to other devices.
      const tombstone: Customer = {
        ...current,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persist(
        records.map((record) => (record.id === id ? tombstone : record)),
        id,
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
      storage.removeItem(STORAGE_KEYS.customers);
      clearSyncState(storage);
      emitDataChanged();
    },
  };
}

export function createLocalStorageInvoiceRepository(
  storage: Storage,
): InvoiceRepository {
  function persist(records: Invoice[], dirtyId: string): void {
    writeInvoices(storage, records);
    markDirty(storage, "invoices", dirtyId);
    emitDataChanged();
  }

  return {
    async list() {
      return sortByUpdatedAt(readInvoices(storage).filter(isLive));
    },
    async getById(id) {
      const record = readInvoices(storage).find((item) => item.id === id);
      return record && isLive(record) ? record : null;
    },
    async create(invoice) {
      persist([invoice, ...readInvoices(storage)], invoice.id);
      return invoice;
    },
    async update(id, invoice) {
      const records = readInvoices(storage);
      if (!records.some((record) => record.id === id)) {
        throw new Error("Invoice not found");
      }
      persist(
        records.map((record) => (record.id === id ? invoice : record)),
        id,
      );
      return invoice;
    },
    async delete(id) {
      const records = readInvoices(storage);
      const current = records.find((record) => record.id === id);
      if (!current) return;

      const now = new Date().toISOString();
      const tombstone: Invoice = {
        ...current,
        deletedAt: now,
        updatedAt: now,
      };
      persist(
        records.map((record) => (record.id === id ? tombstone : record)),
        id,
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
      storage.removeItem(STORAGE_KEYS.invoices);
      clearSyncState(storage);
      emitDataChanged();
    },
  };
}

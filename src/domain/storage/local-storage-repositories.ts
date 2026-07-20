import type {
  Customer,
  CustomerRepository,
  Invoice,
  InvoiceFilters,
  InvoiceRepository,
} from "@/domain/invoices/types";

import {
  STORAGE_KEYS,
  emitDataChanged,
  emitLocalMutation,
  includesQuery,
  isLive,
  readCustomers,
  readInvoices,
  sortByUpdatedAt,
  writeCustomers,
  writeInvoices,
} from "./collection-store";
import { clearSeedFlag } from "@/domain/sync/sync-engine";

export function createLocalStorageCustomerRepository(
  storage: Storage,
): CustomerRepository {
  function persist(records: Customer[], mutated: Customer): void {
    writeCustomers(storage, records);
    emitDataChanged();
    emitLocalMutation({ collection: "customers", record: mutated });
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
      persist([record, ...readCustomers(storage)], record);
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
        updated,
      );
      return updated;
    },
    async delete(id) {
      const records = readCustomers(storage);
      const current = records.find((record) => record.id === id);
      if (!current) return;

      // Soft-delete: keep a tombstone so the deletion syncs to other devices.
      const now = new Date().toISOString();
      const tombstone: Customer = {
        ...current,
        deletedAt: now,
        updatedAt: now,
      };
      persist(
        records.map((record) => (record.id === id ? tombstone : record)),
        tombstone,
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
      clearSeedFlag(storage);
      emitDataChanged();
    },
  };
}

export function createLocalStorageInvoiceRepository(
  storage: Storage,
): InvoiceRepository {
  function persist(records: Invoice[], mutated: Invoice): void {
    writeInvoices(storage, records);
    emitDataChanged();
    emitLocalMutation({ collection: "invoices", record: mutated });
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
      persist([invoice, ...readInvoices(storage)], invoice);
      return invoice;
    },
    async update(id, invoice) {
      const records = readInvoices(storage);
      if (!records.some((record) => record.id === id)) {
        throw new Error("Invoice not found");
      }
      persist(
        records.map((record) => (record.id === id ? invoice : record)),
        invoice,
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
        tombstone,
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
      clearSeedFlag(storage);
      emitDataChanged();
    },
  };
}

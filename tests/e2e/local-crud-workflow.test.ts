import { describe, expect, it } from "vitest";

import { createInvoiceDraft, recalculateInvoice } from "@/domain/invoices/factories";
import {
  createLocalStorageCustomerRepository,
  createLocalStorageInvoiceRepository,
} from "@/domain/storage/local-storage-repositories";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("local invoice workflow", () => {
  it("creates a customer, creates an invoice snapshot, searches, updates, and deletes", async () => {
    const storage = new MemoryStorage();
    const customers = createLocalStorageCustomerRepository(storage);
    const invoices = createLocalStorageInvoiceRepository(storage);

    const customer = await customers.create({
      name: "Acme Textiles",
      address: "Mumbai",
      gstNumber: "27ABCDE1234F1Z5",
      phone: "9999999999",
      email: "billing@acme.test",
    });

    const draft = createInvoiceDraft([]);
    const saved = await invoices.create(
      recalculateInvoice({
        ...draft,
        customerId: customer.id,
        customerSnapshot: {
          name: customer.name,
          address: customer.address,
          gstNumber: customer.gstNumber,
          phone: customer.phone,
          email: customer.email,
        },
        items: [
          {
            ...draft.items[0],
            description: "Website design",
            quantity: 2,
            unitPrice: 1000,
            gstRate: 18,
          },
        ],
      }),
    );

    expect(await invoices.search({ query: "acme", status: "all" })).toHaveLength(1);
    expect(saved.customerSnapshot.name).toBe("Acme Textiles");
    expect(saved.totals.grandTotal).toBe(2360);

    await invoices.update(saved.id, {
      ...saved,
      paymentStatus: "paid",
      amountPaid: saved.totals.grandTotal,
      totals: {
        ...saved.totals,
        amountPaid: saved.totals.grandTotal,
        balanceDue: 0,
      },
    });

    expect(await invoices.search({ status: "paid" })).toHaveLength(1);

    await invoices.delete(saved.id);
    expect(await invoices.list()).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";

import { createInvoiceDraft, createInvoiceItem } from "@/domain/invoices/factories";
import { recalculateInvoice } from "@/domain/invoices/factories";
import { paginateInvoiceItems } from "@/components/invoices/invoice-template";

describe("paginateInvoiceItems", () => {
  it("keeps short invoices on one A4 page", () => {
    const invoice = createInvoiceDraft([]);

    expect(paginateInvoiceItems(invoice.items)).toHaveLength(1);
  });

  it("splits long invoices into continuation pages", () => {
    const invoice = recalculateInvoice({
      ...createInvoiceDraft([]),
      items: Array.from({ length: 21 }, (_, index) =>
        createInvoiceItem({ description: `Line ${index + 1}` }),
      ),
    });

    expect(paginateInvoiceItems(invoice.items).map((page) => page.length)).toEqual([
      8,
      12,
      1,
    ]);
  });
});

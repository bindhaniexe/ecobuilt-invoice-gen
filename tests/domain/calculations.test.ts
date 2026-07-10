import { describe, expect, it } from "vitest";

import { calculateInvoiceTotals } from "@/domain/invoices/calculations";
import type { InvoiceItemInput } from "@/domain/invoices/types";

describe("invoice calculations", () => {
  it("calculates INR GST totals with discounts before GST", () => {
    const items: InvoiceItemInput[] = [
      {
        description: "Website design",
        quantity: 2,
        unitPrice: 1000,
        gstRate: 18,
        discountAmount: 100,
      },
      {
        description: "Hosting",
        quantity: 1,
        unitPrice: 500,
        gstRate: 5,
        discountAmount: 0,
      },
    ];

    const totals = calculateInvoiceTotals(items, 1000);

    expect(totals.subtotal).toBe(2500);
    expect(totals.discount).toBe(100);
    expect(totals.taxableAmount).toBe(2400);
    expect(totals.gst).toBe(367);
    expect(totals.grandTotal).toBe(2767);
    expect(totals.balanceDue).toBe(1767);
    expect(totals.amountInWords).toBe(
      "Two Thousand Seven Hundred Sixty Seven Rupees Only",
    );
  });

  it("caps an excessive line discount at the line gross amount", () => {
    const totals = calculateInvoiceTotals(
      [
        {
          description: "Adjustment",
          quantity: 1,
          unitPrice: 200,
          gstRate: 18,
          discountAmount: 500,
        },
      ],
      0,
    );

    expect(totals.subtotal).toBe(200);
    expect(totals.discount).toBe(200);
    expect(totals.gst).toBe(0);
    expect(totals.grandTotal).toBe(0);
  });
});

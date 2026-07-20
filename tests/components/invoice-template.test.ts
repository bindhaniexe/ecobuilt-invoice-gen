import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InvoicePreview, paginateInvoiceItems } from "@/components/invoices/invoice-template";
import {
  createInvoiceDraft,
  createInvoiceItem,
  recalculateInvoice,
} from "@/domain/invoices/factories";

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

  it("renders quotation documents with the quotation title", () => {
    const invoice = createInvoiceDraft([], "quotation");

    render(React.createElement(InvoicePreview, { invoice, printRef: { current: null } }));

    expect(screen.getAllByRole("heading", { name: "OMM ECO BUILDTECH" })[0]).toBeInTheDocument();
    expect(screen.getByText(/^QT-/)).toBeInTheDocument();
  });
});

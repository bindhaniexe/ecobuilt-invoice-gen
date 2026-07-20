import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { createInvoiceDraft, recalculateInvoice } from "@/domain/invoices/factories";
import { createLocalStorageInvoiceRepository } from "@/domain/storage/local-storage-repositories";

describe("DashboardPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(window, "confirm").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and deletes an invoice successfully", async () => {
    const repo = createLocalStorageInvoiceRepository(window.localStorage);
    const draft = createInvoiceDraft([]);
    await repo.create(
      recalculateInvoice({
        ...draft,
        invoiceNumber: "INV-9999",
        customerSnapshot: {
          name: "Test Client",
          address: "123 Client St",
          gstNumber: "27ABCDE1234F1Z5",
          phone: "9999999999",
          email: "client@test.com",
        },
      }),
    );

    render(<DashboardPage />);

    await waitFor(
      () => {
        expect(screen.getAllByText("INV-9999").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Test Client").length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 25000 },
    );

    const deleteButtons = screen.getAllByRole("button", { name: /Delete invoice/i });
    deleteButtons.forEach((btn) => fireEvent.click(btn));

    expect(window.confirm).toHaveBeenCalledWith("Delete this invoice?");

    await waitFor(() => {
      expect(screen.queryAllByText("INV-9999").length).toBe(0);
      expect(screen.getAllByText(/No invoices yet/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("converts a proforma to a tax invoice in place", async () => {
    const repo = createLocalStorageInvoiceRepository(window.localStorage);
    const saved = await repo.create(
      recalculateInvoice({
        ...createInvoiceDraft([], "proforma"),
        invoiceNumber: "PI-2026-27-0001",
        issueDate: "2026-07-10",
        customerSnapshot: {
          name: "Proforma Client",
          address: "123 Client St",
          gstNumber: "27ABCDE1234F1Z5",
          phone: "9999999999",
          email: "client@test.com",
        },
      }),
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText("PI-2026-27-0001").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Proforma").length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getAllByRole("button", { name: /Convert to Tax Invoice/i })[0]);

    await waitFor(async () => {
      const converted = await repo.getById(saved.id);
      expect(converted?.invoiceType).toBe("tax-invoice");
      expect(converted?.invoiceNumber).toBe("INV-2026-27-0001");
    });

    expect(window.confirm).toHaveBeenCalledWith(
      "Convert Proforma PI-2026-27-0001 to a Tax Invoice?",
    );
  });
});

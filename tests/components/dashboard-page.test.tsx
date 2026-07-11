import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    const user = userEvent.setup();

    // Create an invoice programmatically in localStorage
    const repo = createLocalStorageInvoiceRepository(window.localStorage);
    const draft = createInvoiceDraft([]);
    const saved = await repo.create(
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
      })
    );

    render(<DashboardPage />);

    // Wait for the invoice to be loaded and listed
    await waitFor(() => {
      expect(screen.getAllByText("INV-9999").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Test Client").length).toBeGreaterThanOrEqual(1);
    }, { timeout: 25000 });

    // Locate and click the delete button
    const deleteButtons = screen.getAllByRole("button", { name: /Delete invoice/i });
    deleteButtons.forEach((btn) => fireEvent.click(btn));

    // Verify confirmation dialog was triggered
    expect(window.confirm).toHaveBeenCalledWith("Delete this invoice?");

    // Verify invoice was deleted and the list is now empty
    await waitFor(() => {
      expect(screen.queryAllByText("INV-9999").length).toBe(0);
      expect(screen.getAllByText(/No invoices yet/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});

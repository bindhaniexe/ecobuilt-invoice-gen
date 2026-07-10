import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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
      expect(screen.getByText("INV-9999")).toBeInTheDocument();
      expect(screen.getByText("Test Client")).toBeInTheDocument();
    });

    // Locate and click the delete button
    const deleteButton = screen.getByRole("button", { name: /Delete invoice/i });
    await user.click(deleteButton);

    // Verify confirmation dialog was triggered
    expect(window.confirm).toHaveBeenCalledWith("Delete this invoice?");

    // Verify invoice was deleted and the list is now empty
    await waitFor(() => {
      expect(screen.queryByText("INV-9999")).not.toBeInTheDocument();
      expect(screen.getByText(/No invoices yet/i)).toBeInTheDocument();
    });
  });
});

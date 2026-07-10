import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CustomerManager } from "@/components/customers/customer-manager";

describe("CustomerManager", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(window, "confirm").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("can add and then delete a customer successfully", async () => {
    const user = userEvent.setup();
    render(<CustomerManager />);

    // Wait for initial load to finish and show no customers saved
    await waitFor(() => {
      expect(screen.getByText(/No customers saved/i)).toBeInTheDocument();
    });

    // Fill out the customer form
    const nameInput = screen.getByLabelText(/Name/i);
    const addressInput = screen.getByLabelText(/Address/i);
    const gstInput = screen.getByLabelText(/GST number/i);
    const phoneInput = screen.getByLabelText(/Phone/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const submitButton = screen.getByRole("button", { name: /Add customer/i });

    await user.type(nameInput, "Jane Doe");
    await user.type(addressInput, "456 Oak Lane, Delhi");
    await user.type(gstInput, "07AAAAA1111A1Z1");
    await user.type(phoneInput, "9876543210");
    await user.type(emailInput, "jane@example.com");

    await user.click(submitButton);

    // Verify customer is listed
    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText(/456 Oak Lane/)).toBeInTheDocument();
    });

    // Delete customer
    const deleteButton = screen.getByRole("button", { name: /Delete Jane Doe/i });
    await user.click(deleteButton);

    // Verify confirmation was requested and customer was deleted
    expect(window.confirm).toHaveBeenCalledWith("Delete this customer?");
    await waitFor(() => {
      expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
      expect(screen.getByText(/No customers saved/i)).toBeInTheDocument();
    });
  });
});

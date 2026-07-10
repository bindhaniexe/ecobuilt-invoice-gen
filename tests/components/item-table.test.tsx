import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createInvoiceItem } from "@/domain/invoices/factories";
import { ItemTable } from "@/components/invoices/item-table";

describe("ItemTable", () => {
  it("emits item CRUD actions through public callbacks", async () => {
    const user = userEvent.setup();
    const item = createInvoiceItem({
      description: "Design",
      quantity: 1,
      unitPrice: 1000,
      gstRate: 18,
    });
    const onAdd = vi.fn();
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();
    const onChange = vi.fn();

    render(
      <ItemTable
        items={[item, createInvoiceItem({ description: "Hosting" })]}
        onAdd={onAdd}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add item/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);

    await user.click(screen.getAllByRole("button", { name: /duplicate item/i })[0]);
    expect(onDuplicate).toHaveBeenCalledWith(item.id);

    await user.click(screen.getAllByRole("button", { name: /delete item/i })[0]);
    expect(onDelete).toHaveBeenCalledWith(item.id);

    fireEvent.change(screen.getAllByLabelText(/item description/i)[0], {
      target: { value: "Brand kit" },
    });
    expect(onChange).toHaveBeenLastCalledWith(item.id, {
      description: "Brand kit",
    });
  });
});

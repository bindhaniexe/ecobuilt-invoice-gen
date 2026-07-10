"use client";

import { Copy, Plus, Trash2 } from "lucide-react";

import type { InvoiceItem } from "@/domain/invoices/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ItemTable({
  items,
  onAdd,
  onDuplicate,
  onDelete,
  onChange,
}: {
  items: InvoiceItem[];
  onAdd(): void;
  onDuplicate(itemId: string): void;
  onDelete(itemId: string): void;
  onChange(itemId: string, updates: Partial<InvoiceItem>): void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">Invoice items</h3>
        <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add item
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-hairline">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline bg-surface-soft text-left text-xs font-semibold uppercase tracking-[0.04em] text-muted">
              <th className="px-3 py-3">Description</th>
              <th className="w-24 px-3 py-3 text-right">Qty</th>
              <th className="w-32 px-3 py-3 text-right">Unit price</th>
              <th className="w-24 px-3 py-3 text-right">GST %</th>
              <th className="w-32 px-3 py-3 text-right">Discount</th>
              <th className="w-32 px-3 py-3 text-right">Total</th>
              <th className="w-28 px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-hairline-soft align-top">
                <td className="px-3 py-3">
                  <Input
                    className="h-11"
                    value={item.description}
                    onChange={(event) =>
                      onChange(item.id, { description: event.target.value })
                    }
                    aria-label="Item description"
                  />
                </td>
                <td className="px-3 py-3">
                  <Input
                    className="h-11 text-right"
                    type="number"
                    min="0"
                    step="1"
                    value={item.quantity}
                    onChange={(event) =>
                      onChange(item.id, { quantity: Number(event.target.value) })
                    }
                    aria-label="Quantity"
                  />
                </td>
                <td className="px-3 py-3">
                  <Input
                    className="h-11 text-right"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) =>
                      onChange(item.id, { unitPrice: Number(event.target.value) })
                    }
                    aria-label="Unit price"
                  />
                </td>
                <td className="px-3 py-3">
                  <Input
                    className="h-11 text-right"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.gstRate}
                    onChange={(event) =>
                      onChange(item.id, { gstRate: Number(event.target.value) })
                    }
                    aria-label="GST percent"
                  />
                </td>
                <td className="px-3 py-3">
                  <Input
                    className="h-11 text-right"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.discountAmount}
                    onChange={(event) =>
                      onChange(item.id, {
                        discountAmount: Number(event.target.value),
                      })
                    }
                    aria-label="Discount"
                  />
                </td>
                <td className="px-3 py-5 text-right font-semibold text-ink">
                  {formatCurrency(item.total)}
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Duplicate item"
                      onClick={() => onDuplicate(item.id)}
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Delete item"
                      disabled={items.length === 1}
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

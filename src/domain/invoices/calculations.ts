import { amountToIndianWords } from "./amount-in-words";
import type { InvoiceItem, InvoiceItemInput, InvoiceTotals } from "./types";

export function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function positive(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
}

export function calculateLineItem<T extends InvoiceItemInput>(
  item: T,
): Omit<InvoiceItem, "id"> & T {
  const quantity = positive(item.quantity);
  const unitPrice = positive(item.unitPrice);
  const gstRate = positive(item.gstRate);
  const lineGross = roundMoney(quantity * unitPrice);
  const discountAmount = Math.min(positive(item.discountAmount), lineGross);
  const taxableAmount = roundMoney(lineGross - discountAmount);
  const gstAmount = roundMoney((taxableAmount * gstRate) / 100);
  const total = roundMoney(taxableAmount + gstAmount);

  return {
    ...item,
    quantity,
    unitPrice,
    gstRate,
    discountAmount,
    taxableAmount,
    gstAmount,
    total,
  };
}

export function calculateInvoiceTotals(
  items: InvoiceItemInput[],
  amountPaid = 0,
): InvoiceTotals {
  const calculatedItems = items.map(calculateLineItem);
  const subtotal = roundMoney(
    calculatedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  );
  const discount = roundMoney(
    calculatedItems.reduce((sum, item) => sum + item.discountAmount, 0),
  );
  const taxableAmount = roundMoney(
    calculatedItems.reduce((sum, item) => sum + item.taxableAmount, 0),
  );
  const gst = roundMoney(
    calculatedItems.reduce((sum, item) => sum + item.gstAmount, 0),
  );
  const grandTotal = roundMoney(taxableAmount + gst);
  const paid = roundMoney(positive(amountPaid));
  const balanceDue = roundMoney(Math.max(0, grandTotal - paid));

  return {
    subtotal,
    discount,
    taxableAmount,
    gst,
    grandTotal,
    amountPaid: paid,
    balanceDue,
    amountInWords: amountToIndianWords(grandTotal),
  };
}

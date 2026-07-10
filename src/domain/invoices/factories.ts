import { calculateInvoiceTotals, calculateLineItem } from "./calculations";
import { generateInvoiceNumber } from "./numbering";
import type {
  CompanyDetails,
  CustomerDetails,
  Invoice,
  InvoiceItem,
  InvoiceItemInput,
  PaymentMethod,
  PaymentStatus,
} from "./types";

export const defaultCompany: CompanyDetails = {
  name: "Your Company Name",
  address: "Company address, city, state, PIN",
  gstNumber: "27ABCDE1234F1Z5",
  phone: "+91 98765 43210",
  email: "billing@example.com",
  website: "www.example.com",
};

export const emptyCustomer: CustomerDetails = {
  name: "",
  address: "",
  gstNumber: "",
  phone: "",
  email: "",
};

export function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function createInvoiceItem(
  input: Partial<InvoiceItemInput> = {},
): InvoiceItem {
  const calculated = calculateLineItem({
    description: input.description ?? "",
    quantity: input.quantity ?? 1,
    unitPrice: input.unitPrice ?? 0,
    gstRate: input.gstRate ?? 18,
    discountAmount: input.discountAmount ?? 0,
  });

  return {
    id: createId("item"),
    ...calculated,
  };
}

export function createInvoiceDraft(existingInvoiceNumbers: string[]): Invoice {
  const now = new Date().toISOString();
  const issueDate = now.slice(0, 10);
  const items = [createInvoiceItem({ description: "Service description" })];
  const totals = calculateInvoiceTotals(items, 0);

  return {
    id: createId("inv"),
    invoiceNumber: generateInvoiceNumber(new Date(issueDate), existingInvoiceNumbers),
    issueDate,
    paymentMethod: "bank-transfer" satisfies PaymentMethod,
    paymentStatus: "pending" satisfies PaymentStatus,
    amountPaid: 0,
    company: defaultCompany,
    customerSnapshot: emptyCustomer,
    items,
    notes: "Thank you for your business.",
    terms: "Payment is due within 15 days from the invoice date.",
    signature: defaultCompany.name,
    totals,
    createdAt: now,
    updatedAt: now,
  };
}

export function recalculateInvoice(invoice: Invoice): Invoice {
  const now = new Date().toISOString();
  const items = invoice.items.map((item) => {
    const calculated = calculateLineItem({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      gstRate: item.gstRate,
      discountAmount: item.discountAmount,
    });

    return {
      ...calculated,
      id: item.id,
    };
  });

  return {
    ...invoice,
    items,
    totals: calculateInvoiceTotals(items, invoice.amountPaid),
    updatedAt: now,
  };
}

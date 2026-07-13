import { z } from "zod";

import type { Customer, Invoice } from "./types";

export const paymentStatusSchema = z.enum(["draft", "pending", "paid", "overdue"]);
export const paymentMethodSchema = z.enum([
  "cash",
  "bank-transfer",
  "upi",
  "card",
  "cheque",
]);

export const companyDetailsSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  gstNumber: z.string(),
  phone: z.string(),
  email: z.string().email("Enter a valid email").or(z.literal("")),
  website: z.string(),
});

export const customerDetailsSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  address: z.string().min(1, "Address is required"),
  gstNumber: z.string(),
  phone: z.string(),
  email: z.string().email("Enter a valid email").or(z.literal("")),
});

export const customerSchema = customerDetailsSchema.extend({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const invoiceItemSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  quantity: z.coerce.number().min(0),
  unit: z.string().default("CUM"),
  unitPrice: z.coerce.number().min(0),
  gstRate: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0),
  taxableAmount: z.coerce.number().min(0),
  gstAmount: z.coerce.number().min(0),
  total: z.coerce.number().min(0),
});

export const invoiceTotalsSchema = z.object({
  subtotal: z.number(),
  discount: z.number(),
  taxableAmount: z.number(),
  gst: z.number(),
  grandTotal: z.number(),
  amountPaid: z.number(),
  balanceDue: z.number(),
  amountInWords: z.string(),
});

export const invoiceTypeSchema = z.enum(["tax-invoice", "proforma", "quotation"]);

export const invoiceSchema = z.object({
  id: z.string().min(1),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceType: invoiceTypeSchema.default("tax-invoice"),
  issueDate: z.string().min(1, "Invoice date is required"),
  paymentMethod: paymentMethodSchema,
  paymentStatus: paymentStatusSchema,
  amountPaid: z.coerce.number().min(0),
  company: companyDetailsSchema,
  customerId: z.string().optional(),
  customerSnapshot: customerDetailsSchema,
  items: z.array(invoiceItemSchema).min(1, "Add at least one item"),
  notes: z.string(),
  terms: z.string(),
  signature: z.string(),
  sealUrl: z.string().optional(),
  totals: invoiceTotalsSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  // Quotation specific fields
  dispatchSite: z.string().optional(),
  quotationSubject: z.string().optional(),
  selectedBreadths: z.array(z.string()).optional(),
  gstBlocks: z.coerce.number().optional(),
  gstAdhesive: z.coerce.number().optional(),
  paymentPercentage: z.coerce.number().optional(),
  transportScope: z.string().optional(),
  aacBlocksPrice: z.coerce.number().optional(),
  adhesivePrice: z.coerce.number().optional(),
  freightChargesText: z.string().optional(),
  deliveryTermsText: z.string().optional(),
  otherTermsText: z.string().optional(),
  jurisdictionText: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
});

export const customerListSchema: z.ZodType<Customer[]> = z.array(customerSchema);
export const invoiceListSchema: z.ZodType<Invoice[]> = z.array(invoiceSchema) as unknown as z.ZodType<Invoice[]>;

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

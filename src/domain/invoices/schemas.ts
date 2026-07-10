import { z } from "zod";

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
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0),
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

export const invoiceSchema = z.object({
  id: z.string().min(1),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
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
});

export const customerListSchema = z.array(customerSchema);
export const invoiceListSchema = z.array(invoiceSchema);

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

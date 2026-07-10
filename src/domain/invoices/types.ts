export type PaymentStatus = "draft" | "pending" | "paid" | "overdue";

export type PaymentMethod =
  | "cash"
  | "bank-transfer"
  | "upi"
  | "card"
  | "cheque";

export interface CompanyDetails {
  name: string;
  address: string;
  gstNumber: string;
  phone: string;
  email: string;
  website: string;
}

export interface CustomerDetails {
  name: string;
  address: string;
  gstNumber: string;
  phone: string;
  email: string;
}

export interface Customer extends CustomerDetails {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  discountAmount?: number;
}

export interface InvoiceItem extends InvoiceItemInput {
  id: string;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  total: number;
}

export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  gst: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  amountInWords: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  company: CompanyDetails;
  customerId?: string;
  customerSnapshot: CustomerDetails;
  items: InvoiceItem[];
  notes: string;
  terms: string;
  signature: string;
  sealUrl?: string;
  totals: InvoiceTotals;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFilters {
  query?: string;
  status?: PaymentStatus | "all";
}

export interface InvoiceRepository {
  list(): Promise<Invoice[]>;
  getById(id: string): Promise<Invoice | null>;
  create(invoice: Invoice): Promise<Invoice>;
  update(id: string, invoice: Invoice): Promise<Invoice>;
  delete(id: string): Promise<void>;
  search(filters: InvoiceFilters): Promise<Invoice[]>;
  reset(): Promise<void>;
}

export interface CustomerRepository {
  list(): Promise<Customer[]>;
  getById(id: string): Promise<Customer | null>;
  create(customer: Omit<Customer, "id" | "createdAt" | "updatedAt">): Promise<Customer>;
  update(
    id: string,
    customer: Partial<Omit<Customer, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Customer>;
  delete(id: string): Promise<void>;
  search(query: string): Promise<Customer[]>;
  reset(): Promise<void>;
}

import { calculateInvoiceTotals, calculateLineItem } from "./calculations";
import { generateInvoiceNumber } from "./numbering";
import type {
  CompanyDetails,
  CustomerDetails,
  Invoice,
  InvoiceItem,
  InvoiceItemInput,
  InvoiceType,
  PaymentMethod,
  PaymentStatus,
} from "./types";

export const defaultCompany: CompanyDetails = {
  name: "OMM ECO BUILDTECH",
  address: "Ramdaspur Industrial Estate, Office - Trisulia, Cuttack, Odisha, 754005",
  gstNumber: "21AAGF03736M1Z6",
  phone: "+91 97771 03202",
  email: "ommecobuildtech@gmail.com",
  website: "www.ommecobuildtech.in",
};

export const OMM_BANK_DETAILS = {
  bankName: "BANK OF INDIA",
  accountName: "OMM ECO BUILDTECH",
  accountNumber: "511230110000191",
  ifscCode: "BKID0005112",
  branch: "Kharvel Nagar, Bhubaneswar",
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
    quantity: input.quantity ?? 0,
    unit: input.unit ?? "CUM",
    unitPrice: input.unitPrice ?? 0,
    gstRate: input.gstRate ?? 18,
    discountAmount: input.discountAmount ?? 0,
  });

  return {
    id: createId("item"),
    ...calculated,
  };
}

export function createInvoiceDraft(
  existingInvoiceNumbers: string[],
  type: InvoiceType = "tax-invoice",
): Invoice {
  const now = new Date().toISOString();
  const issueDate = now.slice(0, 10);
  const items = [createInvoiceItem()];
  const totals = calculateInvoiceTotals(items, 0);

  const notes =
    type === "quotation"
      ? "Thank you for the opportunity to quote."
      : "Thank you for your business.";
  const terms =
    type === "quotation"
      ? "This quotation is valid for 15 days from the issue date."
      : type === "proforma"
        ? "This proforma is an estimate only and is not a tax invoice."
        : "Payment is due within 15 days from the invoice date.";

  const quotationFields = type === "quotation" ? {
    dispatchSite: "Balugaon, Bhubaneswar",
    quotationSubject: "Quotation of Autoclaved Aerated Concrete (AAC Blocks) & Adhesive.",
    selectedBreadths: ["75", "125", "150", "250"],
    gstBlocks: 12,
    gstAdhesive: 18,
    paymentPercentage: 100,
    transportScope: "Our Scope",
    aacBlocksPrice: 3300,
    adhesivePrice: 466.10,
    freightChargesText: "Includes above mentioned Supply price. One truck of 25/30 MT carries approximately /33/40 M³ respectively.",
    deliveryTermsText: "As per schedule to be provided by you at least 10 days before dispatch.",
    otherTermsText: "Broken Blocks up to 3% on your account. Any breakages above 3% to be settled & Conditions by way of replacement/credit notes. Corner chippings shall not consider as breakages.",
    jurisdictionText: "All disputes & cases shall be subject to Cuttack Jurisdiction only.",
    contactName: "Surya Pratap Mohanty",
    contactPhone: "9777103202",
  } : {};

  return {
    id: createId("inv"),
    invoiceNumber: generateInvoiceNumber(new Date(issueDate), existingInvoiceNumbers, type),
    invoiceType: type,
    issueDate,
    paymentMethod: "bank-transfer" satisfies PaymentMethod,
    paymentStatus: "pending" satisfies PaymentStatus,
    amountPaid: 0,
    company: defaultCompany,
    customerSnapshot: emptyCustomer,
    items,
    notes,
    terms,
    signature: defaultCompany.name,
    totals,
    createdAt: now,
    updatedAt: now,
    ...quotationFields,
  };
}

export function recalculateInvoice(invoice: Invoice): Invoice {
  const now = new Date().toISOString();
  const items = invoice.items.map((item) => {
    const calculated = calculateLineItem({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
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

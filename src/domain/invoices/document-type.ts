import type { InvoiceType } from "./types";

/** Tax invoices count toward revenue; proforma and quotation do not. */
export function isRevenueInvoiceType(type: InvoiceType): boolean {
  return type === "tax-invoice";
}

export function isConvertibleToTaxInvoice(type: InvoiceType): boolean {
  return type === "proforma";
}

export function getInvoiceTypeLabel(
  type: InvoiceType,
  style: "short" | "long" = "short",
): string {
  switch (type) {
    case "proforma":
      return style === "long" ? "Proforma Invoice" : "Proforma";
    case "quotation":
      return style === "long" ? "Quotation" : "Quotation";
    case "tax-invoice":
    default:
      return style === "long" ? "Tax Invoice" : "Tax Invoice";
  }
}

export function parseInvoiceTypeParam(value: string | null | undefined): InvoiceType {
  if (value === "proforma" || value === "quotation" || value === "tax-invoice") {
    return value;
  }
  return "tax-invoice";
}

export type QuotationSubjectMode = "both" | "blocks" | "adhesive";

export function getQuotationSubjectMode(subjectText?: string): QuotationSubjectMode {
  if (!subjectText) return "both";
  const s = subjectText.trim();
  const lower = s.toLowerCase();

  if (
    s === "Quotation of AAC Block Adhesive." ||
    (lower.includes("adhesive") && !lower.includes("autoclaved") && !lower.includes("&") && !lower.includes(" and "))
  ) {
    return "adhesive";
  }

  if (
    s === "Quotation of Autoclaved Aerated Concrete (AAC Blocks)." ||
    (lower.includes("autoclaved") && !lower.includes("adhesive"))
  ) {
    return "blocks";
  }

  return "both";
}

import type { RefObject } from "react";

import type { Invoice, InvoiceItem } from "@/domain/invoices/types";
import { defaultCompany, OMM_BANK_DETAILS } from "@/domain/invoices/factories";
import { formatCurrency, formatDate } from "@/lib/utils";

const FIRST_PAGE_LIMIT = 8;
const CONTINUATION_PAGE_LIMIT = 12;

export function paginateInvoiceItems(items: InvoiceItem[]): InvoiceItem[][] {
  if (items.length <= FIRST_PAGE_LIMIT) return [items];

  const pages = [items.slice(0, FIRST_PAGE_LIMIT)];
  let index = FIRST_PAGE_LIMIT;

  while (index < items.length) {
    pages.push(items.slice(index, index + CONTINUATION_PAGE_LIMIT));
    index += CONTINUATION_PAGE_LIMIT;
  }

  return pages;
}

export function InvoicePreview({
  invoice,
  printRef,
}: {
  invoice: Invoice;
  printRef: RefObject<HTMLDivElement | null>;
}) {
  const pages = paginateInvoiceItems(invoice.items);

  return (
    <div
      ref={printRef}
      className="print-area flex flex-col items-center gap-6"
      aria-label="Invoice preview"
    >
      {pages.map((items, index) => (
        <InvoiceTemplate
          key={`${invoice.id}-${index}`}
          invoice={invoice}
          items={items}
          pageNumber={index + 1}
          pageCount={pages.length}
          isFirstPage={index === 0}
          isLastPage={index === pages.length - 1}
        />
      ))}
    </div>
  );
}

export function InvoiceTemplate({
  invoice,
  items,
  pageNumber,
  pageCount,
  isFirstPage,
  isLastPage,
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  pageNumber: number;
  pageCount: number;
  isFirstPage: boolean;
  isLastPage: boolean;
}) {
  return (
    <article className="invoice-page shadow-airbnb">
      <div className="flex min-h-[297mm] flex-col p-[14mm]">
        <header className="flex items-start justify-between gap-8 border-b border-hairline pb-6">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="Company logo"
              className="h-14 w-14 rounded-md object-contain"
            />
            <div>
              <h2 className="max-w-[100mm] text-[22px] font-semibold leading-tight text-ink">
                {defaultCompany.name}
              </h2>
              <p className="mt-2 max-w-[85mm] whitespace-pre-line text-[11px] leading-5 text-muted">
                {defaultCompany.address}
              </p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-[28px] font-bold leading-none text-ink">Invoice</h1>
            <p
              className="mt-3 px-4 py-2 text-[12px] font-semibold text-ink"
              style={{ backgroundColor: "#f7f7f7", borderRadius: "9999px" }}
            >
              {invoice.invoiceNumber}
            </p>
            <p className="mt-3 text-[10px] uppercase tracking-[0.08em] text-muted">
              Page {pageNumber} of {pageCount}
            </p>
          </div>
        </header>

        <section className="grid grid-cols-[1.1fr_0.9fr] gap-8 border-b border-hairline py-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              Bill to
            </p>
            <h3 className="mt-2 text-[16px] font-semibold text-ink">
              {invoice.customerSnapshot.name || "Customer name"}
            </h3>
            <p className="mt-2 whitespace-pre-line text-[11px] leading-5 text-body">
              {invoice.customerSnapshot.address || "Customer address"}
            </p>
            <div className="mt-3 space-y-1 text-[11px] text-muted">
              <p>GST: {invoice.customerSnapshot.gstNumber || "-"}</p>
              <p>Phone: {invoice.customerSnapshot.phone || "-"}</p>
              <p>Email: {invoice.customerSnapshot.email || "-"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11px]">
            <PreviewMeta label="Invoice date" value={formatDate(invoice.issueDate)} />
            <PreviewMeta label="Payment status" value={invoice.paymentStatus} />
            <PreviewMeta label="Payment method" value={invoice.paymentMethod} />
            <PreviewMeta label="Balance due" value={formatCurrency(invoice.totals.balanceDue)} />
            <PreviewMeta label="Company GST" value={defaultCompany.gstNumber || "-"} />
            <PreviewMeta label="Company phone" value={defaultCompany.phone || "-"} />
          </div>
        </section>

        {!isFirstPage ? (
          <p className="mt-5 text-[11px] font-semibold text-muted">
            Continued from previous page
          </p>
        ) : null}

        <section className="mt-5 flex-1">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr
                className="text-left text-[10px] uppercase tracking-[0.06em] text-muted"
                style={{ backgroundColor: "#f7f7f7" }}
              >
                <th className="px-3 py-3" style={{ borderRadius: "8px 0 0 8px" }}>Description</th>
                <th className="px-3 py-3 text-right">Qty</th>
                <th className="px-3 py-3 text-right">Rate</th>
                <th className="px-3 py-3 text-right">GST</th>
                <th className="px-3 py-3 text-right">Discount</th>
                <th className="px-3 py-3 text-right" style={{ borderRadius: "0 8px 8px 0" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-hairline-soft">
                  <td className="max-w-[70mm] px-3 py-4 align-top font-medium text-ink">
                    {item.description || "Item description"}
                  </td>
                  <td className="px-3 py-4 text-right align-top">{item.quantity}</td>
                  <td className="px-3 py-4 text-right align-top">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-3 py-4 text-right align-top">{item.gstRate}%</td>
                  <td className="px-3 py-4 text-right align-top">
                    {formatCurrency(item.discountAmount)}
                  </td>
                  <td className="px-3 py-4 text-right align-top font-semibold text-ink">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {isLastPage ? (
          <footer className="mt-8 grid grid-cols-[1fr_72mm] gap-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                Amount in words
              </p>
              <p className="mt-2 text-[12px] font-semibold leading-5 text-ink">
                {invoice.totals.amountInWords}
              </p>

              <div className="mt-6 grid gap-5">
                <div
                  className="p-3"
                  style={{ backgroundColor: "#f7f7f7", border: "1px solid #dddddd", borderRadius: "14px" }}
                >
                  <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                    Bank Account Details
                  </p>
                  <div className="mt-2 text-[10px] leading-relaxed text-body grid grid-cols-[100px_1fr] gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-muted">Bank Name:</span>
                    <span className="font-medium text-ink">{OMM_BANK_DETAILS.bankName}</span>
                    <span className="font-semibold text-muted">Account Name:</span>
                    <span className="font-medium text-ink">{OMM_BANK_DETAILS.accountName}</span>
                    <span className="font-semibold text-muted">Account No:</span>
                    <span className="font-bold text-ink">{OMM_BANK_DETAILS.accountNumber}</span>
                    <span className="font-semibold text-muted">IFSC Code:</span>
                    <span className="font-bold text-ink">{OMM_BANK_DETAILS.ifscCode}</span>
                    <span className="font-semibold text-muted">Branch:</span>
                    <span className="font-medium text-ink">{OMM_BANK_DETAILS.branch}</span>
                  </div>
                </div>
                <PreviewTextBlock label="Terms and conditions" value={invoice.terms} />
                <PreviewTextBlock label="Notes" value={invoice.notes} />
              </div>
            </div>

            <div>
              <div
                className="p-4 text-[12px]"
                style={{ border: "1px solid #dddddd", borderRadius: "14px" }}
              >
                <TotalRow label="Subtotal" value={invoice.totals.subtotal} />
                <TotalRow label="Discount" value={invoice.totals.discount} />
                <TotalRow label="Taxable amount" value={invoice.totals.taxableAmount} />
                <TotalRow label="GST" value={invoice.totals.gst} />
                <TotalRow label="Amount paid" value={invoice.totals.amountPaid} />
                <div className="mt-3 border-t border-hairline pt-3">
                  <TotalRow
                    label="Grand total"
                    value={invoice.totals.grandTotal}
                    strong
                  />
                  <TotalRow
                    label="Balance due"
                    value={invoice.totals.balanceDue}
                    strong
                  />
                </div>
              </div>

              <div className="mt-8 text-right">
                {invoice.sealUrl ? (
                  <div className="ml-auto mb-4 flex h-16 w-32 items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={invoice.sealUrl}
                      alt="Company seal"
                      className="max-h-16 max-w-32 object-contain"
                    />
                  </div>
                ) : null}
                <div className="ml-auto mt-8 h-px w-40 bg-ink" />
                <p className="mt-2 text-[11px] font-semibold text-ink">
                  {invoice.signature || defaultCompany.name}
                </p>
                <p className="text-[10px] text-muted">Authorized signature</p>
              </div>
            </div>
          </footer>
        ) : (
          <footer className="mt-8 border-t border-hairline pt-4 text-right text-[11px] text-muted">
            Continued on next page
          </footer>
        )}
      </div>
    </article>
  );
}

function PreviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-semibold capitalize text-ink">{value}</p>
    </div>
  );
}

function PreviewTextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line text-[11px] leading-5 text-body">
        {value || "-"}
      </p>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className={strong ? "font-semibold text-ink" : "text-muted"}>{label}</span>
      <span className={strong ? "font-bold text-ink" : "font-medium text-ink"}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

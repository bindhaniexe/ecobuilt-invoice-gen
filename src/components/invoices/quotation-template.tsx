"use client";

import type { RefObject } from "react";
import type { Invoice } from "@/domain/invoices/types";
import { formatDate } from "@/lib/utils";

export function QuotationPreview({
  invoice,
  printRef,
}: {
  invoice: Invoice;
  printRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={printRef}
      className="print-area flex flex-col items-center gap-6"
      aria-label="Quotation preview"
    >
      <QuotationTemplatePage1 invoice={invoice} />
      <QuotationTemplatePage2 invoice={invoice} />
    </div>
  );
}

export function QuotationTemplatePage1({ invoice }: { invoice: Invoice }) {
  const selectedBreadths = invoice.selectedBreadths || ["75", "125", "150", "250"];
  const formattedBreadth = selectedBreadths
    .map((b) => b.padStart(3, "0"))
    .join("/") + "MM";

  return (
    <article className="invoice-page shadow-airbnb">
      <div className="flex min-h-[297mm] flex-col p-[14mm]">
        {/* Header */}
        <header className="flex justify-between items-start border-b-2 border-emerald-600 pb-4">
          <div>
            <h1 className="text-[26px] font-bold text-ink leading-tight">OMM ECO BUILDTECH</h1>
            <p className="text-xs text-muted font-medium mt-1">Manufacturer of Quality AAC Blocks</p>
          </div>
          <div className="flex flex-col items-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="OMM ECOBUILT Logo" className="h-14 w-auto object-contain" />
            <span className="text-[10px] font-bold mt-2 text-ink">GSTN-21AAGFO3736M1Z6</span>
          </div>
        </header>

        {/* Ref and Date */}
        <div className="flex justify-between items-center text-[12px] font-semibold mt-4 text-ink">
          <div>Ref. No. <span className="underline">{invoice.invoiceNumber}</span></div>
          <div>Date: <span className="underline">{formatDate(invoice.issueDate)}</span></div>
        </div>

        {/* Customer Info */}
        <div className="mt-5 text-[12px] text-ink leading-relaxed">
          <div className="font-semibold">To,</div>
          <div className="pl-4 font-semibold">{invoice.customerSnapshot.name || "Customer Name"}</div>
          <div className="pl-4 whitespace-pre-line">{invoice.customerSnapshot.address || "Customer Address"}</div>
        </div>

        {/* Dispatch Site */}
        <div className="mt-4 text-[12px] font-semibold text-ink">
          Dispatch Site: <span className="font-normal">{invoice.dispatchSite || "Balugaon, Bhubaneswar"}</span>
        </div>

        {/* Subject */}
        <div className="mt-3 text-[12px] font-bold text-ink border-y border-hairline py-2">
          Sub: {invoice.quotationSubject || "Quotation of Autoclaved Aerated Concrete (AAC Blocks) & Adhesive."}
        </div>

        {/* Salutation */}
        <div className="mt-4 text-[12px] text-ink">
          <p>Dear Sir,</p>
          <p className="mt-1 leading-relaxed">
            We are pleased to submit our best offer for supply of <strong>Omm Eco Buildtech</strong> AAC Blocks for your project.
          </p>
        </div>

        {/* Quotation details 1-8 */}
        <div className="mt-4 space-y-3.5 text-[12px] text-ink leading-relaxed">
          <div className="grid grid-cols-[24px_1fr] gap-2">
            <div className="font-semibold text-right">1.</div>
            <div>
              <span className="font-semibold">Item:</span>
              <div className="mt-0.5 pl-4">(a) Autoclaved Aerated Concrete (AAC Blocks), as per IS:2185(Part-III)</div>
              <div className="pl-4">(b) Masonry work is governed by IS 6041.</div>
            </div>
          </div>

          <div className="grid grid-cols-[24px_1fr] gap-2">
            <div className="font-semibold text-right">2.</div>
            <div>
              <span className="font-semibold">Size:</span>
              <div className="mt-1 grid grid-cols-[100px_220px_100px] text-[10px] font-bold uppercase tracking-wider text-muted border-b pb-0.5">
                <div>Length</div>
                <div>Breadth</div>
                <div>Height</div>
              </div>
              <div className="grid grid-cols-[100px_220px_100px] text-[12px] font-semibold mt-0.5">
                <div>600MM</div>
                <div>{formattedBreadth}</div>
                <div>200 MM</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[24px_1fr] gap-2">
            <div className="font-semibold text-right">3.</div>
            <div>
              <span className="font-semibold">Supply Price:</span>
              <span className="ml-2 font-medium">
                Rs. {invoice.aacBlocksPrice ?? 3300} PER CUM BLOCK & Rs. {invoice.adhesivePrice ?? 466.10} PER BAG For Adhesive (40 KG)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-[24px_1fr] gap-2">
            <div className="font-semibold text-right">4.</div>
            <div>
              <span className="font-semibold">Extra GST:</span>
              <span className="ml-2 font-medium">
                @ {invoice.gstBlocks ?? 12}% on AAC Blocks & @ {invoice.gstAdhesive ?? 18}% on Adhesive on the above price respectively.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-[24px_1fr] gap-2">
            <div className="font-semibold text-right">5.</div>
            <div>
              <span className="font-semibold">Payment:</span>
              <span className="ml-2 font-medium">
                Advance {invoice.paymentPercentage ?? 100}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-[24px_1fr] gap-2">
            <div className="font-semibold text-right">6.</div>
            <div>
              <span className="font-semibold">Freight Charges:</span>
              <span className="ml-2 font-medium whitespace-pre-line">{invoice.freightChargesText}</span>
            </div>
          </div>

          <div className="grid grid-cols-[24px_1fr] gap-2">
            <div className="font-semibold text-right">7.</div>
            <div>
              <span className="font-semibold">Transport:</span>
              <span className="ml-2 font-medium">{invoice.transportScope ?? "Our Scope"}.</span>
            </div>
          </div>

          <div className="grid grid-cols-[24px_1fr] gap-2">
            <div className="font-semibold text-right">8.</div>
            <div>
              <span className="font-semibold">Delivery:</span>
              <span className="ml-2 font-medium whitespace-pre-line">{invoice.deliveryTermsText}</span>
            </div>
          </div>
        </div>

        {/* Warning text */}
        <div className="mt-6 p-3 rounded-lg border-l-4 border-emerald-600 bg-emerald-50/30 text-[10.5px] font-semibold leading-relaxed text-ink">
          (Any increase change in Govt. levies/Charges/Statutory/Taxes/ GST etc. During the pendency of the contract shall be to the buyers account & the same be enforceable & payable by you only, with immediate effect.)
        </div>

        {/* Page Footer */}
        <QuotationFooter />
      </div>
    </article>
  );
}

export function QuotationTemplatePage2({ invoice }: { invoice: Invoice }) {
  return (
    <article className="invoice-page shadow-airbnb">
      <div className="flex min-h-[297mm] flex-col p-[14mm]">
        {/* Header */}
        <header className="flex justify-between items-start border-b border-hairline pb-4">
          <div>
            <h2 className="text-[18px] font-bold text-ink leading-tight">OMM ECO BUILDTECH</h2>
          </div>
          <div className="text-right text-[10px] text-muted">
            Quotation Ref: {invoice.invoiceNumber}
          </div>
        </header>

        {/* Details 9-11 */}
        <div className="mt-6 space-y-5 text-[12px] text-ink leading-relaxed flex-1">
          <div className="grid grid-cols-[24px_1fr] gap-2">
            <div className="font-semibold text-right">9.</div>
            <div>
              <span className="font-semibold">Other Terms & Conditions:</span>
              <span className="ml-2 whitespace-pre-line">{invoice.otherTermsText}</span>
            </div>
          </div>

          <div className="grid grid-cols-[24px_1fr] gap-2">
            <div className="font-semibold text-right">10.</div>
            <div>
              <span className="font-semibold">Jurisdiction:</span>
              <span className="ml-2 font-medium">{invoice.jurisdictionText}</span>
            </div>
          </div>

          <div className="grid grid-cols-[24px_1fr] gap-2">
            <div className="font-semibold text-right">11.</div>
            <div>
              <span className="font-semibold">Statutory Info:</span>
              <span className="ml-2">The Following key details:</span>
              <div className="mt-2 pl-4 space-y-1 text-[11px]">
                <p className="font-bold text-ink">M/S. OMM ECO BUILDTECH</p>
                <p className="font-mono text-ink">(GSTIN-21AAGFO3736M1Z6)</p>
                <p className="font-mono text-ink">PAN No. AAGFO376M</p>
                <div className="mt-3 p-3 bg-surface-soft border border-hairline rounded-lg max-w-sm">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Bank Account Details
                  </span>
                  <div className="grid grid-cols-[90px_1fr] gap-x-2 text-[11px] leading-relaxed">
                    <span className="font-semibold text-muted">Bank Name:</span>
                    <span className="font-semibold text-ink">BANK OF INDIA</span>
                    <span className="font-semibold text-muted">Account Name:</span>
                    <span className="font-semibold text-ink">OMM ECO BUILDTECH</span>
                    <span className="font-semibold text-muted">Account No:</span>
                    <span className="font-bold text-ink">511230110000191</span>
                    <span className="font-semibold text-muted">IFSC Code:</span>
                    <span className="font-bold text-ink">BKID0005112</span>
                    <span className="font-semibold text-muted">Branch:</span>
                    <span className="font-medium text-ink">Kharaval Nagar, Bhubaneswar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Clarification */}
          <div className="mt-6 border-t border-hairline-soft pt-4 text-[12px] text-ink">
            <p>
              We shall be pleased to provide any further clarification to you if required. Please feel free to contact us on our email id: <span className="font-semibold text-emerald-700 font-mono">ommecobuildtech@gmail.com</span>.
            </p>
            <p className="mt-2">We look forward for you valued order against this offer.</p>
            <p className="mt-2 font-medium">Thanking You,</p>
          </div>

          {/* Signature Block */}
          <div className="mt-8 flex justify-between items-end">
            <div className="text-[12px] text-ink">
              <p className="font-semibold">Yours Faithfully,</p>
              <p className="font-bold text-emerald-700 mt-1">For Omm Eco Buildtech</p>
              <div className="mt-14">
                <p className="font-bold text-ink">{invoice.contactName || "Surya Pratap Mohanty"}</p>
                <p className="text-xs font-semibold text-muted">{invoice.contactPhone || "9777103202"}</p>
              </div>
            </div>
            {invoice.sealUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={invoice.sealUrl}
                alt="Company seal"
                className="max-h-16 max-w-32 object-contain mr-4"
              />
            ) : null}
          </div>
        </div>

        {/* Page Footer */}
        <QuotationFooter />
      </div>
    </article>
  );
}

function QuotationFooter() {
  return (
    <footer className="mt-auto border-t border-hairline pt-3 text-[10px] text-muted text-center leading-normal">
      <div className="flex items-center justify-center gap-1 font-medium text-ink">
        <span className="text-[11px]">📍</span>
        <span>Factory Site - OMM ECO BUILDTECH, 4/18, 4/19, 4/20 Ramdaspur Industrial Estate, PS- Baranga Cuttack- 754006</span>
      </div>
      <div className="mt-0.5">
        Reg. Office - Plot No-686/714, Trisulia, PS- Baranga, Po- Brahmanigaon, Cuttack- 754005
      </div>
      <div className="mt-1 flex items-center justify-center gap-4 text-[10.5px] font-semibold">
        <span className="flex items-center gap-1">📞 94370 32202, 94370 34005</span>
        <span className="flex items-center gap-1">✉️ ommecobuildtech@gmail.com</span>
        <span className="flex items-center gap-1">🌐 www.ommecobuildtech.in</span>
      </div>
    </footer>
  );
}

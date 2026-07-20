"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  Download,
  FileCheck,
  MessageCircle,
  Printer,
  Save,
} from "lucide-react";

import {
  createId,
  createInvoiceDraft,
  createInvoiceItem,
  recalculateInvoice,
  defaultCompany,
  OMM_BANK_DETAILS,
} from "@/domain/invoices/factories";
import {
  getInvoiceTypeLabel,
  isConvertibleToTaxInvoice,
  parseInvoiceTypeParam,
} from "@/domain/invoices/document-type";
import { generateInvoiceNumber } from "@/domain/invoices/numbering";
import { invoiceSchema } from "@/domain/invoices/schemas";
import type {
  CompanyDetails,
  CustomerDetails,
  Invoice,
  InvoiceType,
  PaymentMethod,
  PaymentStatus,
} from "@/domain/invoices/types";
import { useCustomers, useInvoices } from "@/hooks/use-local-data";
import {
  canShareInvoicePdf,
  createInvoicePdfFile,
  downloadInvoicePdf,
} from "@/lib/pdf";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { InvoicePreview } from "./invoice-template";
import { ItemTable } from "./item-table";

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "bank-transfer", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
];

const paymentStatuses: Array<{ value: PaymentStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

export function InvoiceEditorPage({ invoiceId }: { invoiceId?: string }) {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const { repository: invoiceRepository } = useInvoices();
  const { customers } = useCustomers();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [existingInvoiceNumbers, setExistingInvoiceNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [previewScale, setPreviewScale] = useState(1);
  const [previewHeight, setPreviewHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const repository = invoiceRepository;
    if (!repository) return;

    let cancelled = false;

    async function loadInvoice(activeRepository: NonNullable<typeof repository>) {
      setLoading(true);
      setFormError("");

      try {
        const allInvoices = await activeRepository.list();
        const existing = allInvoices.map((record) => record.invoiceNumber);
        if (!cancelled) setExistingInvoiceNumbers(existing);

        if (invoiceId) {
          const existingInvoice = allInvoices.find((record) => record.id === invoiceId);
          if (!cancelled) {
            setInvoice(
              existingInvoice
                ? {
                    ...existingInvoice,
                    company: defaultCompany,
                  }
                : null,
            );
          }
        } else {
          const typeParam = parseInvoiceTypeParam(
            typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("type")
              : undefined,
          );
          if (!cancelled) setInvoice(createInvoiceDraft(existing, typeParam));
        }
      } catch (error) {
        if (!cancelled) {
          setInvoice(null);
          setFormError((error as Error).message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInvoice(repository);

    return () => {
      cancelled = true;
    };
  }, [invoiceId, invoiceRepository]);

  function updateInvoice(updater: (current: Invoice) => Invoice) {
    setInvoice((current) => (current ? recalculateInvoice(updater(current)) : current));
  }

  // Fit the fixed A4 preview into the available width on mobile without
  // changing the invoice layout. Print/PDF temporarily use full size.
  useLayoutEffect(() => {
    if (!invoice) return;

    const viewport = previewViewportRef.current;
    if (!viewport) return;

    // CSS mm at 96dpi — matches browser rendering of width: 210mm
    const A4_WIDTH_PX = (210 * 96) / 25.4;

    const updateScale = () => {
      const styles = window.getComputedStyle(viewport);
      const paddingX =
        Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
      const availableWidth = viewport.clientWidth - paddingX;
      if (availableWidth <= 0) return;
      const next = Math.min(1, availableWidth / A4_WIDTH_PX);
      setPreviewScale(Number(next.toFixed(4)));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    window.addEventListener("resize", updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [invoice]);

  useLayoutEffect(() => {
    if (!invoice) return;

    const printRoot = printRef.current;
    if (!printRoot) return;

    const updateHeight = () => {
      // offsetHeight is unscaled layout size; multiply by preview scale
      setPreviewHeight(printRoot.offsetHeight * previewScale);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(printRoot);
    return () => observer.disconnect();
  }, [invoice, previewScale]);

  async function handleSave(options?: {
    quiet?: boolean;
    skipNavigation?: boolean;
  }): Promise<Invoice | null> {
    if (!invoiceRepository || !invoice) return null;

    const normalized = recalculateInvoice({
      ...invoice,
      company: defaultCompany,
    });
    const parsed = invoiceSchema.safeParse(normalized);

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check the invoice fields.");
      return null;
    }

    setSaving(true);
    setFormError("");

    try {
      const saved = invoiceId
        ? await invoiceRepository.update(invoice.id, parsed.data)
        : await invoiceRepository.create(parsed.data);

      setInvoice(saved);
      if (!options?.quiet) {
        setMessage("Invoice saved.");
      }

      if (!invoiceId && !options?.skipNavigation) {
        router.replace(`/invoices/${saved.id}/edit`);
      }

      return saved;
    } catch (error) {
      setFormError((error as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handlePrint() {
    const saved = await handleSave({ quiet: true, skipNavigation: true });
    if (!saved) return;
    setMessage("Invoice saved. Opening print dialog...");
    window.print();
    if (!invoiceId) {
      router.replace(`/invoices/${saved.id}/edit`);
    }
  }

  async function handleDownload() {
    if (!invoice) return;

    const saved = await handleSave({ quiet: true, skipNavigation: true });
    if (!saved) return;

    setExporting(true);
    setFormError("");
    setMessage("Invoice saved. Exporting PDF...");

    try {
      await downloadInvoicePdf(saved, saved.invoiceNumber);
      setMessage("Invoice saved and PDF downloaded.");
    } catch (error) {
      setFormError((error as Error).message || "PDF export failed.");
    } finally {
      setExporting(false);
      if (!invoiceId) {
        router.replace(`/invoices/${saved.id}/edit`);
      }
    }
  }

  async function handleWhatsAppShare() {
    if (!invoice) return;

    const saved = await handleSave({ quiet: true, skipNavigation: true });
    if (!saved) return;

    setSharing(true);
    setFormError("");
    setMessage("Invoice saved. Preparing WhatsApp share...");

    try {
      const file = await createInvoicePdfFile(saved, saved.invoiceNumber);

      const customerName = saved.customerSnapshot.name || "Customer";
      const shareText = [
        `Invoice ${saved.invoiceNumber}`,
        `Customer: ${customerName}`,
        `Grand total: ${formatCurrency(saved.totals.grandTotal)}`,
        `Balance due: ${formatCurrency(saved.totals.balanceDue)}`,
        "",
        "Shared from OMM ECO BUILDTECH",
      ].join("\n");

      if (canShareInvoicePdf(file)) {
        try {
          await navigator.share({
            files: [file],
            title: `Invoice ${saved.invoiceNumber}`,
            text: shareText,
          });
          setMessage("Invoice saved and shared.");
          return;
        } catch (error) {
          // User cancelled the system share sheet — not an error.
          if ((error as Error).name === "AbortError") {
            setMessage("Invoice saved. Share cancelled.");
            return;
          }
        }
      }

      // Fallback: download PDF, then open WhatsApp with invoice summary.
      // Browsers can't attach local files to wa.me links directly.
      const objectUrl = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);

      const phone = saved.customerSnapshot.phone?.replace(/\D/g, "") ?? "";
      const whatsappUrl = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(
            `${shareText}\n\nPDF downloaded — attach ${file.name} in WhatsApp.`,
          )}`
        : `https://wa.me/?text=${encodeURIComponent(
            `${shareText}\n\nPDF downloaded — attach ${file.name} in WhatsApp.`,
          )}`;

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      setMessage(
        "Invoice saved. PDF downloaded — attach it in WhatsApp to complete sharing.",
      );
    } catch (error) {
      setFormError((error as Error).message || "WhatsApp share failed.");
    } finally {
      setSharing(false);
      if (!invoiceId) {
        router.replace(`/invoices/${saved.id}/edit`);
      }
    }
  }

  if (loading) {
    return (
      <div className="app-section py-16 text-center text-sm text-muted">
        Loading invoice editor...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="app-section py-16">
        <div className="section-panel mx-auto max-w-xl p-6 text-center">
          <h1 className="text-[22px] font-semibold text-ink">Invoice not found</h1>
          <p className="mt-2 text-sm text-muted">
            The invoice could not be loaded from local storage.
          </p>
          {formError ? <p className="mt-3 text-sm text-[#c13515]">{formError}</p> : null}
          <Button asChild className="mt-6">
            <Link href="/">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="app-section no-print mb-8">
        <div className="flex flex-col gap-4">
          <div>
            <Button asChild variant="tertiary" className="-ml-3">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
          </div>
          
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-[28px] font-bold leading-tight text-ink">
                {invoiceId ? "Edit invoice" : "Create invoice"}
              </h1>
              <p className="mt-1.5 text-sm text-muted">
                Live preview stays aligned with the A4 export target.
              </p>
            </div>
            {isConvertibleToTaxInvoice(invoice.invoiceType) ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    updateInvoice((current) => {
                      const nextType = "tax-invoice";
                      const generatedNum = generateInvoiceNumber(
                        new Date(current.issueDate),
                        existingInvoiceNumbers,
                        nextType
                      );
                      return {
                        ...current,
                        invoiceType: nextType,
                        invoiceNumber: generatedNum,
                      };
                    });
                    setMessage("Converted to Tax Invoice. Save to persist changes.");
                  }}
                >
                  <FileCheck className="h-4 w-4" aria-hidden="true" />
                  Convert to Tax Invoice
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {formError ? (
          <div className="mt-4 rounded-md border border-[#f3b4a2] bg-[#fff4f1] p-4 text-sm text-[#c13515]">
            {formError}
          </div>
        ) : null}
        {message ? (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-[#b7e4c7] bg-[#edf7ed] p-4 text-sm text-[#245536]">
            <FileCheck className="h-4 w-4" aria-hidden="true" />
            {message}
          </div>
        ) : null}
        {isConvertibleToTaxInvoice(invoice.invoiceType) && (
          <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-md border border-[#fbbf24] bg-[#fffbeb] p-4 text-sm text-[#92400e]">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#d97706] shrink-0" aria-hidden="true" />
              <span>
                This is a <strong>{getInvoiceTypeLabel(invoice.invoiceType, "long")}</strong>. It uses prefix <code>{invoice.invoiceType === "quotation" ? "QT-" : "PI-"}</code>, does not increment official tax sequence numbers, and is excluded from actual revenue dashboard analytics.
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="min-h-9 h-9 px-3 shrink-0"
              onClick={() => {
                updateInvoice((current) => {
                  const nextType = "tax-invoice";
                  const generatedNum = generateInvoiceNumber(
                    new Date(current.issueDate),
                    existingInvoiceNumbers,
                    nextType
                  );
                  return {
                    ...current,
                    invoiceType: nextType,
                    invoiceNumber: generatedNum,
                  };
                });
                setMessage("Converted to Tax Invoice. Save to persist changes.");
              }}
            >
              Convert to Tax Invoice
            </Button>
          </div>
        )}
      </div>

      <div className="app-section flex min-w-0 flex-col gap-6">
        <div className="no-print min-w-0 space-y-6">
          {invoice.invoiceType === "quotation" ? (
            <>
              {/* Quotation Details Section */}
              <section className="section-panel p-5 md:p-6">
                <SectionHeading title="Quotation details" />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Document type" htmlFor="invoice-type">
                    <Select
                      id="invoice-type"
                      value={invoice.invoiceType}
                      onChange={(event) => {
                        const nextType = event.target.value as InvoiceType;
                        updateInvoice((current) => {
                          const generatedNum = generateInvoiceNumber(
                            new Date(current.issueDate),
                            existingInvoiceNumbers,
                            nextType
                          );
                          return {
                            ...current,
                            invoiceType: nextType,
                            invoiceNumber: generatedNum,
                          };
                        });
                      }}
                    >
                      <option value="tax-invoice">Tax Invoice</option>
                      <option value="proforma">Proforma Invoice</option>
                      <option value="quotation">Quotation</option>
                    </Select>
                  </Field>
                  <Field label="Quotation number" htmlFor="invoice-number">
                    <Input
                      id="invoice-number"
                      value={invoice.invoiceNumber}
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          invoiceNumber: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Quotation date" htmlFor="issue-date">
                    <Input
                      id="issue-date"
                      type="date"
                      value={invoice.issueDate}
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          issueDate: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Dispatch Site" htmlFor="dispatch-site">
                    <Input
                      id="dispatch-site"
                      value={invoice.dispatchSite ?? ""}
                      placeholder="Balugaon, Bhubaneswar"
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          dispatchSite: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Quotation Subject" htmlFor="quotation-subject">
                      <Input
                        id="quotation-subject"
                        value={invoice.quotationSubject ?? ""}
                        placeholder="Quotation of Autoclaved Aerated Concrete (AAC Blocks) & Adhesive."
                        onChange={(event) =>
                          updateInvoice((current) => ({
                            ...current,
                            quotationSubject: event.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Contact Person" htmlFor="contact-name">
                    <Input
                      id="contact-name"
                      value={invoice.contactName ?? ""}
                      placeholder="Surya Pratap Mohanty"
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          contactName: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Contact Phone" htmlFor="contact-phone">
                    <Input
                      id="contact-phone"
                      value={invoice.contactPhone ?? ""}
                      placeholder="9777103202"
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          contactPhone: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Company seal URL (optional)" htmlFor="seal-url">
                    <Input
                      id="seal-url"
                      value={invoice.sealUrl ?? ""}
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          sealUrl: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
              </section>

              {/* Customer Details Section */}
              <section className="section-panel p-5 md:p-6">
                <SectionHeading title="Customer details" />
                <Field label="Select saved customer" htmlFor="customer-select">
                  <Select
                    id="customer-select"
                    value={invoice.customerId ?? "manual"}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "manual") {
                        updateInvoice((current) => ({
                          ...current,
                          customerId: undefined,
                        }));
                        return;
                      }
                      const customer = customers.find((record) => record.id === value);
                      if (!customer) return;
                      updateInvoice((current) => ({
                        ...current,
                        customerId: customer.id,
                        customerSnapshot: {
                          name: customer.name,
                          address: customer.address,
                          gstNumber: customer.gstNumber,
                          phone: customer.phone,
                          email: customer.email,
                        },
                      }));
                    }}
                  >
                    <option value="manual">Manual customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="mt-4">
                  <DetailsFields
                    details={invoice.customerSnapshot}
                    onChange={(customerSnapshot) =>
                      updateInvoice((current) => ({
                        ...current,
                        customerSnapshot,
                      }))
                    }
                  />
                </div>
              </section>

              {/* Quotation Pricing & Terms Section */}
              <section className="section-panel p-5 md:p-6">
                <SectionHeading title="Quotation Pricing & Terms" />
                <div className="space-y-6">
                  <div>
                    <span className="text-sm font-semibold text-ink block mb-2">Breadth of the size</span>
                    <div className="flex flex-wrap gap-4 p-3 bg-surface-soft border border-hairline rounded-lg">
                      {["75", "100", "125", "150", "200", "250"].map((b) => {
                        const currentSelected = invoice.selectedBreadths || ["75", "125", "150", "250"];
                        return (
                          <label key={b} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                            <input
                              type="checkbox"
                              checked={currentSelected.includes(b)}
                              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              onChange={(e) => {
                                const checked = e.target.checked;
                                const nextSelected = checked
                                  ? [...currentSelected, b].sort((x, y) => Number(x) - Number(y))
                                  : currentSelected.filter((x) => x !== b);
                                updateInvoice((current) => ({
                                  ...current,
                                  selectedBreadths: nextSelected,
                                }));
                              }}
                            />
                            <span>{b} MM</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="AAC Blocks Price (Per CUM)" htmlFor="aac-blocks-price">
                      <Input
                        id="aac-blocks-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={invoice.aacBlocksPrice ?? 3300}
                        onChange={(event) =>
                          updateInvoice((current) => ({
                            ...current,
                            aacBlocksPrice: Number(event.target.value),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Adhesive Price (Per BAG)" htmlFor="adhesive-price">
                      <Input
                        id="adhesive-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={invoice.adhesivePrice ?? 466.10}
                        onChange={(event) =>
                          updateInvoice((current) => ({
                            ...current,
                            adhesivePrice: Number(event.target.value),
                          }))
                        }
                      />
                    </Field>
                    <Field label="GST on AAC Blocks" htmlFor="gst-blocks">
                      <Select
                        id="gst-blocks"
                        value={invoice.gstBlocks ?? 12}
                        onChange={(event) =>
                          updateInvoice((current) => ({
                            ...current,
                            gstBlocks: Number(event.target.value),
                          }))
                        }
                      >
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                      </Select>
                    </Field>
                    <Field label="GST on Adhesive" htmlFor="gst-adhesive">
                      <Select
                        id="gst-adhesive"
                        value={invoice.gstAdhesive ?? 18}
                        onChange={(event) =>
                          updateInvoice((current) => ({
                            ...current,
                            gstAdhesive: Number(event.target.value),
                          }))
                        }
                      >
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                      </Select>
                    </Field>
                    <Field label="Payment Term (Advance)" htmlFor="payment-percentage">
                      <Select
                        id="payment-percentage"
                        value={invoice.paymentPercentage ?? 100}
                        onChange={(event) =>
                          updateInvoice((current) => ({
                            ...current,
                            paymentPercentage: Number(event.target.value),
                          }))
                        }
                      >
                        <option value="20">20%</option>
                        <option value="40">40%</option>
                        <option value="60">60%</option>
                        <option value="80">80%</option>
                        <option value="100">100%</option>
                      </Select>
                    </Field>
                    <Field label="Transport" htmlFor="transport-scope">
                      <Select
                        id="transport-scope"
                        value={invoice.transportScope ?? "Our Scope"}
                        onChange={(event) =>
                          updateInvoice((current) => ({
                            ...current,
                            transportScope: event.target.value,
                          }))
                        }
                      >
                        <option value="Our Scope">Our Scope</option>
                        <option value="Your Scope">Your Scope</option>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Freight Charges" htmlFor="freight-charges-text">
                      <Textarea
                        id="freight-charges-text"
                        value={invoice.freightChargesText ?? ""}
                        onChange={(event) =>
                          updateInvoice((current) => ({
                            ...current,
                            freightChargesText: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Delivery Terms" htmlFor="delivery-terms-text">
                      <Textarea
                        id="delivery-terms-text"
                        value={invoice.deliveryTermsText ?? ""}
                        onChange={(event) =>
                          updateInvoice((current) => ({
                            ...current,
                            deliveryTermsText: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Other Terms & Conditions" htmlFor="other-terms-text">
                      <Textarea
                        id="other-terms-text"
                        value={invoice.otherTermsText ?? ""}
                        onChange={(event) =>
                          updateInvoice((current) => ({
                            ...current,
                            otherTermsText: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Jurisdiction" htmlFor="jurisdiction-text">
                      <Textarea
                        id="jurisdiction-text"
                        value={invoice.jurisdictionText ?? ""}
                        onChange={(event) =>
                          updateInvoice((current) => ({
                            ...current,
                            jurisdictionText: event.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="section-panel p-5 md:p-6">
                <SectionHeading title="Invoice details" />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Invoice type" htmlFor="invoice-type">
                    <Select
                      id="invoice-type"
                      value={invoice.invoiceType}
                      onChange={(event) => {
                        const nextType = event.target.value as InvoiceType;
                        updateInvoice((current) => {
                          const generatedNum = generateInvoiceNumber(
                            new Date(current.issueDate),
                            existingInvoiceNumbers,
                            nextType
                          );
                          return {
                            ...current,
                            invoiceType: nextType,
                            invoiceNumber: generatedNum,
                          };
                        });
                      }}
                    >
                      <option value="tax-invoice">Tax Invoice</option>
                      <option value="proforma">Proforma Invoice</option>
                      <option value="quotation">Quotation</option>
                    </Select>
                  </Field>
                  <Field label="Invoice number" htmlFor="invoice-number">
                    <Input
                      id="invoice-number"
                      value={invoice.invoiceNumber}
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          invoiceNumber: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Invoice date" htmlFor="issue-date">
                    <Input
                      id="issue-date"
                      type="date"
                      value={invoice.issueDate}
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          issueDate: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Payment method" htmlFor="payment-method">
                    <Select
                      id="payment-method"
                      value={invoice.paymentMethod}
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          paymentMethod: event.target.value as PaymentMethod,
                        }))
                      }
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Payment status" htmlFor="payment-status">
                    <Select
                      id="payment-status"
                      value={invoice.paymentStatus}
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          paymentStatus: event.target.value as PaymentStatus,
                        }))
                      }
                    >
                      {paymentStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Amount paid" htmlFor="amount-paid">
                    <Input
                      id="amount-paid"
                      type="number"
                      min="0"
                      step="0.01"
                      value={invoice.amountPaid}
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          amountPaid: Number(event.target.value),
                        }))
                      }
                    />
                  </Field>
                  <div className="rounded-md border border-hairline bg-surface-soft p-4">
                    <p className="text-sm text-muted">Balance due</p>
                    <p className="mt-2 text-[22px] font-semibold text-ink">
                      {formatCurrency(invoice.totals.balanceDue)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="section-panel p-5 md:p-6 bg-surface-soft/30">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-hairline">
                  <h2 className="text-lg font-semibold text-ink">Company Details (Hardcoded)</h2>
                  <span className="text-[11px] font-semibold bg-[#edf7ed] text-[#245536] border border-[#b7e4c7] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Locked
                  </span>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Company Name</p>
                    <p className="mt-1 font-semibold text-ink">{defaultCompany.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">GST Number</p>
                    <p className="mt-1 font-mono font-semibold text-ink">{defaultCompany.gstNumber}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Address</p>
                    <p className="mt-1 text-ink">{defaultCompany.address}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Phone</p>
                    <p className="mt-1 text-ink">{defaultCompany.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Email</p>
                    <p className="mt-1 text-ink">{defaultCompany.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Website</p>
                    <p className="mt-1 text-ink">{defaultCompany.website}</p>
                  </div>
                  <div className="md:col-span-2 mt-2 pt-3 border-t border-hairline-soft">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Hardcoded Bank Account Details</p>
                    <div className="grid gap-2 grid-cols-2 md:grid-cols-3 bg-white p-3 rounded border border-hairline">
                      <div>
                        <span className="text-xs text-muted block">Bank Name</span>
                        <span className="font-semibold text-ink text-xs">{OMM_BANK_DETAILS.bankName}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted block">Account Name</span>
                        <span className="font-semibold text-ink text-xs">{OMM_BANK_DETAILS.accountName}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted block">Account Number</span>
                        <span className="font-bold text-ink text-xs">{OMM_BANK_DETAILS.accountNumber}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted block">IFSC Code</span>
                        <span className="font-bold text-ink text-xs">{OMM_BANK_DETAILS.ifscCode}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-muted block">Branch</span>
                        <span className="font-semibold text-ink text-xs">{OMM_BANK_DETAILS.branch}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="section-panel p-5 md:p-6">
                <SectionHeading title="Customer details" />
                <Field label="Select saved customer" htmlFor="customer-select">
                  <Select
                    id="customer-select"
                    value={invoice.customerId ?? "manual"}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "manual") {
                        updateInvoice((current) => ({
                          ...current,
                          customerId: undefined,
                        }));
                        return;
                      }
                      const customer = customers.find((record) => record.id === value);
                      if (!customer) return;
                      updateInvoice((current) => ({
                        ...current,
                        customerId: customer.id,
                        customerSnapshot: {
                          name: customer.name,
                          address: customer.address,
                          gstNumber: customer.gstNumber,
                          phone: customer.phone,
                          email: customer.email,
                        },
                      }));
                    }}
                  >
                    <option value="manual">Manual customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="mt-4">
                  <DetailsFields
                    details={invoice.customerSnapshot}
                    onChange={(customerSnapshot) =>
                      updateInvoice((current) => ({
                        ...current,
                        customerSnapshot,
                      }))
                    }
                  />
                </div>
              </section>

              <section className="section-panel p-5 md:p-6">
                <ItemTable
                  items={invoice.items}
                  onAdd={() =>
                    updateInvoice((current) => ({
                      ...current,
                      items: [...current.items, createInvoiceItem()],
                    }))
                  }
                  onDuplicate={(itemId) =>
                    updateInvoice((current) => {
                      const source = current.items.find((item) => item.id === itemId);
                      if (!source) return current;
                      return {
                        ...current,
                        items: [
                          ...current.items,
                          {
                            ...source,
                            id: createId("item"),
                          },
                        ],
                      };
                    })
                  }
                  onDelete={(itemId) =>
                    updateInvoice((current) => ({
                      ...current,
                      items:
                        current.items.length === 1
                          ? current.items
                          : current.items.filter((item) => item.id !== itemId),
                    }))
                  }
                  onChange={(itemId, updates) =>
                    updateInvoice((current) => ({
                      ...current,
                      items: current.items.map((item) =>
                        item.id === itemId ? { ...item, ...updates } : item,
                      ),
                    }))
                  }
                />
              </section>

              <section className="section-panel p-5 md:p-6">
                <SectionHeading title="Notes and signature" />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Terms and conditions" htmlFor="terms">
                    <Textarea
                      id="terms"
                      value={invoice.terms}
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          terms: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Additional notes" htmlFor="notes">
                    <Textarea
                      id="notes"
                      value={invoice.notes}
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Signature name" htmlFor="signature">
                    <Input
                      id="signature"
                      value={invoice.signature}
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          signature: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Company seal URL (optional)" htmlFor="seal-url">
                    <Input
                      id="seal-url"
                      value={invoice.sealUrl ?? ""}
                      onChange={(event) =>
                        updateInvoice((current) => ({
                          ...current,
                          sealUrl: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
              </section>
            </>
          )}
        </div>

        <aside className="min-w-0 max-w-full">
          <div className="no-print mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-3 sm:justify-start">
              <h2 className="text-base font-semibold text-ink">Live preview</h2>
              <p className="text-sm text-muted">A4 output</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={saving || exporting || sharing}
                onClick={() => void handlePrint()}
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                {saving ? "Saving..." : "Print"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={saving || exporting || sharing}
                onClick={() => void handleDownload()}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {exporting ? "Exporting..." : saving ? "Saving..." : "Download PDF"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={saving || exporting || sharing}
                onClick={() => void handleWhatsAppShare()}
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                {sharing
                  ? "Sharing..."
                  : saving
                    ? "Saving..."
                    : "WhatsApp"}
              </Button>
              <Button
                type="button"
                disabled={saving || exporting || sharing}
                onClick={() => void handleSave()}
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {saving ? "Saving..." : "Save invoice"}
              </Button>
            </div>
          </div>
          <div
            ref={previewViewportRef}
            className="max-w-full overflow-x-hidden overflow-y-auto overscroll-x-contain rounded-md border border-hairline bg-surface-soft p-4"
          >
            <div
              className="mx-auto overflow-hidden"
              style={{
                width: previewScale < 1 ? "100%" : "210mm",
                height: previewHeight,
                maxWidth: "100%",
              }}
            >
              <div
                className="invoice-preview-scale"
                style={
                  {
                    "--preview-scale": String(previewScale),
                    width: "210mm",
                  } as CSSProperties
                }
              >
                <InvoicePreview invoice={invoice} printRef={printRef} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h2 className="mb-5 text-lg font-semibold text-ink">{title}</h2>;
}

function DetailsFields<TDetails extends CustomerDetails | CompanyDetails>({
  details,
  onChange,
  includeWebsite = false,
}: {
  details: TDetails;
  onChange(details: TDetails): void;
  includeWebsite?: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Name" htmlFor={`${includeWebsite ? "company" : "customer"}-name`}>
        <Input
          id={`${includeWebsite ? "company" : "customer"}-name`}
          value={details.name}
          onChange={(event) => onChange({ ...details, name: event.target.value })}
        />
      </Field>
      <Field label="GST number" htmlFor={`${includeWebsite ? "company" : "customer"}-gst`}>
        <Input
          id={`${includeWebsite ? "company" : "customer"}-gst`}
          value={details.gstNumber}
          onChange={(event) => onChange({ ...details, gstNumber: event.target.value })}
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="Address" htmlFor={`${includeWebsite ? "company" : "customer"}-address`}>
          <Textarea
            id={`${includeWebsite ? "company" : "customer"}-address`}
            value={details.address}
            onChange={(event) => onChange({ ...details, address: event.target.value })}
          />
        </Field>
      </div>
      <Field label="Phone" htmlFor={`${includeWebsite ? "company" : "customer"}-phone`}>
        <Input
          id={`${includeWebsite ? "company" : "customer"}-phone`}
          value={details.phone}
          onChange={(event) => onChange({ ...details, phone: event.target.value })}
        />
      </Field>
      <Field label="Email" htmlFor={`${includeWebsite ? "company" : "customer"}-email`}>
        <Input
          id={`${includeWebsite ? "company" : "customer"}-email`}
          type="email"
          value={details.email}
          onChange={(event) => onChange({ ...details, email: event.target.value })}
        />
      </Field>
      {includeWebsite && "website" in details ? (
        <div className="md:col-span-2">
          <Field label="Website" htmlFor="company-website">
            <Input
              id="company-website"
              value={details.website}
              onChange={(event) =>
                onChange({ ...details, website: event.target.value } as TDetails)
              }
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}

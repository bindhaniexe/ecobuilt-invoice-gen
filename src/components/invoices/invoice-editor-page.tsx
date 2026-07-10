"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileCheck,
  Printer,
  Save,
} from "lucide-react";

import {
  createId,
  createInvoiceDraft,
  createInvoiceItem,
  recalculateInvoice,
} from "@/domain/invoices/factories";
import { invoiceSchema } from "@/domain/invoices/schemas";
import type {
  CompanyDetails,
  CustomerDetails,
  Invoice,
  PaymentMethod,
  PaymentStatus,
} from "@/domain/invoices/types";
import { useCustomers, useInvoices } from "@/hooks/use-local-data";
import { downloadInvoicePdf } from "@/lib/pdf";
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
  const { repository: invoiceRepository } = useInvoices();
  const { customers } = useCustomers();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const repository = invoiceRepository;
    if (!repository) return;

    let cancelled = false;

    async function loadInvoice(activeRepository: NonNullable<typeof repository>) {
      setLoading(true);
      setFormError("");

      try {
        if (invoiceId) {
          const existing = await activeRepository.getById(invoiceId);
          if (!cancelled) setInvoice(existing);
        } else {
          const existingNumbers = (await activeRepository.list()).map(
            (record) => record.invoiceNumber,
          );
          if (!cancelled) setInvoice(createInvoiceDraft(existingNumbers));
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

  async function handleSave() {
    if (!invoiceRepository || !invoice) return;

    const normalized = recalculateInvoice(invoice);
    const parsed = invoiceSchema.safeParse(normalized);

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check the invoice fields.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const saved = invoiceId
        ? await invoiceRepository.update(invoice.id, parsed.data)
        : await invoiceRepository.create(parsed.data);

      setInvoice(saved);
      setMessage("Invoice saved.");

      if (!invoiceId) {
        router.replace(`/invoices/${saved.id}/edit`);
      }
    } catch (error) {
      setFormError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    if (!printRef.current || !invoice) return;
    setExporting(true);
    setFormError("");
    try {
      await downloadInvoicePdf(printRef.current, invoice.invoiceNumber);
    } catch (error) {
      setFormError((error as Error).message || "PDF export failed.");
    } finally {
      setExporting(false);
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
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" aria-hidden="true" />
                Print
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={exporting}
                onClick={() => void handleDownload()}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {exporting ? "Exporting..." : "Download PDF"}
              </Button>
              <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                <Save className="h-4 w-4" aria-hidden="true" />
                {saving ? "Saving..." : "Save invoice"}
              </Button>
            </div>
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
      </div>

      <div className="app-section flex flex-col gap-6">
        <div className="no-print space-y-6">
          <section className="section-panel p-5 md:p-6">
            <SectionHeading title="Invoice details" />
            <div className="grid gap-4 md:grid-cols-2">
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

          <DetailsSection
            title="Company details"
            details={invoice.company}
            onChange={(company) =>
              updateInvoice((current) => ({
                ...current,
                company,
                signature:
                  current.signature === current.company.name
                    ? company.name
                    : current.signature,
              }))
            }
            includeWebsite
          />

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
        </div>

        <aside>
          <div className="no-print mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Live preview</h2>
            <p className="text-sm text-muted">A4 output</p>
          </div>
          <div className="overflow-auto rounded-md border border-hairline bg-surface-soft p-4">
            <InvoicePreview invoice={invoice} printRef={printRef} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h2 className="mb-5 text-lg font-semibold text-ink">{title}</h2>;
}

function DetailsSection({
  title,
  details,
  onChange,
  includeWebsite = false,
}: {
  title: string;
  details: CompanyDetails;
  onChange(details: CompanyDetails): void;
  includeWebsite?: boolean;
}) {
  return (
    <section className="section-panel p-5 md:p-6">
      <SectionHeading title={title} />
      <DetailsFields details={details} onChange={onChange} includeWebsite={includeWebsite} />
    </section>
  );
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

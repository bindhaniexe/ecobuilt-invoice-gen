"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Edit,
  FileText,
  IndianRupee,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import type { PaymentStatus } from "@/domain/invoices/types";
import { useInvoices } from "@/hooks/use-local-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const statusOptions: Array<{ label: string; value: PaymentStatus | "all" }> = [
  { label: "All statuses", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
];

function statusTone(status: PaymentStatus) {
  return status;
}

export function DashboardPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "all">("all");
  const { invoices, loading, error, remove, reset } = useInvoices({
    query,
    status,
  });

  const stats = useMemo(() => {
    const paid = invoices.filter((invoice) => invoice.paymentStatus === "paid");
    const pending = invoices.filter((invoice) => invoice.paymentStatus === "pending");
    const outstanding = invoices.reduce(
      (sum, invoice) => sum + invoice.totals.balanceDue,
      0,
    );

    return {
      total: invoices.length,
      paid: paid.length,
      pending: pending.length,
      outstanding,
    };
  }, [invoices]);

  return (
    <div className="app-section py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-muted">Local-first workspace</p>
          <h1 className="mt-2 text-[28px] font-bold leading-tight text-ink">
            Invoices
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Create, edit, print, and export A4 invoices from this browser.
          </p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create invoice
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-4" aria-label="Invoice summary">
        <StatTile label="Total invoices" value={stats.total.toString()} icon={FileText} />
        <StatTile label="Paid" value={stats.paid.toString()} icon={FileText} />
        <StatTile label="Pending" value={stats.pending.toString()} icon={FileText} />
        <StatTile
          label="Balance due"
          value={formatCurrency(stats.outstanding)}
          icon={IndianRupee}
        />
      </section>

      <section className="section-panel mt-8 p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              className="rounded-full pl-11"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search invoices, customers, GST numbers"
              aria-label="Search invoices"
            />
          </div>
          <Select
            className="md:w-56"
            value={status}
            onChange={(event) => setStatus(event.target.value as PaymentStatus | "all")}
            aria-label="Filter by status"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {error ? (
          <div className="mt-6 rounded-md border border-[#f3b4a2] bg-[#fff4f1] p-4">
            <p className="font-medium text-[#c13515]">Invoice data needs attention.</p>
            <p className="mt-1 text-sm text-body">
              Stored invoice records could not be read. Resetting removes only the
              corrupted local invoice records.
            </p>
            <Button className="mt-4" variant="danger" onClick={() => void reset()}>
              Reset invoice storage
            </Button>
          </div>
        ) : null}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.04em] text-muted">
                <th className="py-3 pr-4">Invoice</th>
                <th className="py-3 pr-4">Customer</th>
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 text-right">Total</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length ? (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-hairline-soft">
                    <td className="py-4 pr-4 font-semibold text-ink">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="py-4 pr-4">{invoice.customerSnapshot.name || "Manual"}</td>
                    <td className="py-4 pr-4">{formatDate(invoice.issueDate)}</td>
                    <td className="py-4 pr-4">
                      <Badge tone={statusTone(invoice.paymentStatus)}>
                        {invoice.paymentStatus}
                      </Badge>
                    </td>
                    <td className="py-4 pr-4 text-right font-semibold text-ink">
                      {formatCurrency(invoice.totals.grandTotal)}
                    </td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="ghost" size="icon" aria-label="Edit invoice">
                          <Link href={`/invoices/${invoice.id}/edit`}>
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete invoice"
                          onClick={() => {
                            if (window.confirm("Delete this invoice?")) {
                              void remove(invoice.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <p className="font-semibold text-ink">No invoices yet</p>
                    <p className="mt-1 text-sm text-muted">
                      Create your first invoice to see it here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof FileText;
}) {
  return (
    <div className="section-panel p-5">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-surface-strong text-ink">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-[22px] font-semibold leading-tight text-ink">{value}</p>
    </div>
  );
}

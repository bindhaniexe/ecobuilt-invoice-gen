"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  DollarSign,
  Edit,
  FileCheck,
  FileQuestion,
  FileText,
  Hourglass,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Invoice, InvoiceType, PaymentStatus } from "@/domain/invoices/types";
import { generateInvoiceNumber } from "@/domain/invoices/numbering";
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

/* ---------- Aging helpers ---------- */

interface AgingBucket {
  label: string;
  amount: number;
}

function computeAgingBuckets(invoices: Invoice[]): AgingBucket[] {
  const now = Date.now();
  const buckets: AgingBucket[] = [
    { label: "0-30 days", amount: 0 },
    { label: "30-60 days", amount: 0 },
    { label: "60-90 days", amount: 0 },
    { label: "90+ days", amount: 0 },
  ];

  for (const inv of invoices) {
    if (
      inv.paymentStatus === "paid" ||
      inv.paymentStatus === "draft" ||
      inv.invoiceType === "proforma"
    ) {
      continue;
    }
    const days = Math.floor(
      (now - new Date(inv.issueDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    const due = inv.totals.balanceDue;
    if (days < 30) buckets[0].amount += due;
    else if (days < 60) buckets[1].amount += due;
    else if (days < 90) buckets[2].amount += due;
    else buckets[3].amount += due;
  }

  return buckets;
}

interface ClientRevenue {
  name: string;
  revenue: number;
}

function computeTopClients(invoices: Invoice[], limit = 5): ClientRevenue[] {
  const map = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.invoiceType === "proforma") continue;
    const name = inv.customerSnapshot.name || "Manual";
    map.set(name, (map.get(name) ?? 0) + inv.totals.grandTotal);
  }
  return [...map.entries()]
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/* ---------- Dashboard ---------- */

export function DashboardPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "tax-invoice" | "proforma">("all");
  const { invoices, loading, error, remove, reset, repository, refresh } = useInvoices({
    query,
    status,
  });

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (typeFilter === "all") return true;
      if (typeFilter === "tax-invoice") return inv.invoiceType !== "proforma";
      return inv.invoiceType === "proforma";
    });
  }, [invoices, typeFilter]);

  const stats = useMemo(() => {
    // Filter invoices by type first
    const taxInvoices = invoices.filter((inv) => inv.invoiceType !== "proforma");
    const proformaInvoices = invoices.filter((inv) => inv.invoiceType === "proforma");

    const totalInvoiced = taxInvoices.reduce(
      (sum, inv) => sum + inv.totals.grandTotal,
      0,
    );
    const received = taxInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const outstanding = taxInvoices.reduce(
      (sum, inv) => sum + inv.totals.balanceDue,
      0,
    );
    const overdueInvoices = taxInvoices.filter(
      (inv) => inv.paymentStatus === "overdue",
    );
    const overdue = overdueInvoices.reduce(
      (sum, inv) => sum + inv.totals.balanceDue,
      0,
    );

    // Proforma Pipeline (active/pending quotes)
    const proformaPipeline = proformaInvoices.reduce(
      (sum, inv) => sum + inv.totals.balanceDue,
      0,
    );

    return {
      totalInvoiced,
      received,
      outstanding,
      overdue,
      overdueCount: overdueInvoices.length,
      proformaPipeline,
      proformaCount: proformaInvoices.length,
    };
  }, [invoices]);

  const agingBuckets = useMemo(
    () => computeAgingBuckets(invoices),
    [invoices],
  );
  const agingTotal = useMemo(
    () => agingBuckets.reduce((s, b) => s + b.amount, 0),
    [agingBuckets],
  );

  const topClients = useMemo(() => computeTopClients(invoices), [invoices]);

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
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href="/invoices/new?type=proforma">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Proforma
            </Link>
          </Button>
          <Button asChild>
            <Link href="/invoices/new?type=tax-invoice">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Invoice summary">
        <StatCard
          label="Total Invoiced"
          value={formatCurrency(stats.totalInvoiced)}
          subtitle="all time"
          icon={FileText}
          accentColor="#334155"
          borderColor="#cbd5e1"
        />
        <StatCard
          label="Received"
          value={formatCurrency(stats.received)}
          subtitle="all time"
          icon={DollarSign}
          accentColor="#76b810"
          borderColor="#a3d660"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(stats.outstanding)}
          subtitle="unpaid invoices"
          icon={Hourglass}
          accentColor="#d97706"
          borderColor="#fbbf24"
        />
        <StatCard
          label="Overdue"
          value={formatCurrency(stats.overdue)}
          subtitle={
            stats.overdueCount === 0
              ? "nothing overdue"
              : `${stats.overdueCount} overdue`
          }
          icon={AlertCircle}
          accentColor="#e53e3e"
          borderColor="#fc8181"
        />
        <StatCard
          label="Proforma Pipeline"
          value={formatCurrency(stats.proformaPipeline)}
          subtitle={
            stats.proformaCount === 0
              ? "no active quotes"
              : `${stats.proformaCount} active quotes`
          }
          icon={FileQuestion}
          accentColor="#7c3aed"
          borderColor="#c084fc"
        />
      </section>

      {/* ── Analytics ── */}
      <h2 className="mb-4 mt-10 text-[20px] font-bold text-ink">Analytics</h2>
      <section className="grid gap-4 md:grid-cols-2" aria-label="Analytics">
        {/* Outstanding Invoice Aging */}
        <div className="section-panel p-6">
          <h3 className="text-[15px] font-bold text-ink">
            Outstanding Invoice Aging
          </h3>
          <p className="mt-1 text-sm text-muted">
            Total: {formatCurrency(agingTotal)}
          </p>
          <AgingChart buckets={agingBuckets} />
        </div>

        {/* Top Clients */}
        <div className="section-panel p-6">
          <h3 className="text-[15px] font-bold text-ink">Top Clients</h3>
          <p className="mt-1 text-sm text-muted">Revenue by client</p>
          {topClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted">
              <BarChart3 className="mb-3 h-10 w-10 opacity-40" aria-hidden="true" />
              <p className="text-sm">
                No client revenue data for the selected period
              </p>
            </div>
          ) : (
            <TopClientsChart clients={topClients} />
          )}
        </div>
      </section>

      {/* ── Invoice Table ── */}
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
            className="md:w-48"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | "tax-invoice" | "proforma")}
            aria-label="Filter by type"
          >
            <option value="all">All types</option>
            <option value="tax-invoice">Tax Invoices</option>
            <option value="proforma">Proforma Invoices</option>
          </Select>
          <Select
            className="md:w-48"
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
              ) : filteredInvoices.length ? (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-hairline-soft">
                    <td className="py-4 pr-4 font-semibold text-ink">
                      <div className="flex flex-col gap-1 items-start">
                        <span>{invoice.invoiceNumber}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border leading-none font-semibold ${
                          invoice.invoiceType === "proforma"
                            ? "bg-[#faf5ff] text-[#6b21a8] border-[#e9d5ff]"
                            : "bg-[#f8fafc] text-[#475569] border-[#e2e8f0]"
                        }`}>
                          {invoice.invoiceType === "proforma" ? "Proforma" : "Tax Invoice"}
                        </span>
                      </div>
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
                        {invoice.invoiceType === "proforma" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Convert to Tax Invoice"
                            aria-label="Convert to Tax Invoice"
                            onClick={async () => {
                              if (!repository) return;
                              if (window.confirm(`Convert Proforma ${invoice.invoiceNumber} to a Tax Invoice?`)) {
                                const allInvoices = await repository.list();
                                const existing = allInvoices.map((record) => record.invoiceNumber);
                                const nextType: InvoiceType = "tax-invoice";
                                const generatedNum = generateInvoiceNumber(
                                  new Date(invoice.issueDate),
                                  existing,
                                  nextType
                                );
                                const updatedInvoice: Invoice = {
                                  ...invoice,
                                  invoiceType: nextType,
                                  invoiceNumber: generatedNum,
                                  updatedAt: new Date().toISOString()
                                };
                                await repository.update(invoice.id, updatedInvoice);
                                await refresh();
                              }
                            }}
                          >
                            <FileCheck className="h-4 w-4 text-[#76b810]" aria-hidden="true" />
                          </Button>
                        )}
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

/* ---------- Stat Card ---------- */

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  accentColor,
  borderColor,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  accentColor: string;
  borderColor: string;
}) {
  return (
    <div
      className="section-panel relative overflow-hidden p-5"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          {label}
        </p>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: `${borderColor}22` }}
        >
          <Icon
            className="h-4 w-4"
            style={{ color: accentColor }}
            aria-hidden="true"
          />
        </div>
      </div>
      <p
        className="mt-3 text-[24px] font-bold leading-tight"
        style={{ color: accentColor }}
      >
        {value}
      </p>
      <p className="mt-1 text-[12px] text-muted">{subtitle}</p>
    </div>
  );
}

/* ---------- Aging Bar Chart (pure CSS) ---------- */

function AgingChart({ buckets }: { buckets: AgingBucket[] }) {
  const max = Math.max(...buckets.map((b) => b.amount), 1);

  // Y-axis ticks
  const yTicks = generateYTicks(max);
  const chartMax = yTicks[yTicks.length - 1];

  return (
    <div className="mt-6 flex gap-2" style={{ height: 200 }}>
      {/* Y-axis labels */}
      <div className="flex flex-col justify-between pb-6 text-right text-[10px] text-muted">
        {[...yTicks].reverse().map((tick) => (
          <span key={tick}>{formatYLabel(tick)}</span>
        ))}
      </div>

      {/* Bars area */}
      <div className="flex flex-1 items-end gap-3 border-l border-b border-hairline-soft pb-6 pl-2">
        {buckets.map((bucket) => {
          const pct = chartMax > 0 ? (bucket.amount / chartMax) * 100 : 0;
          return (
            <div
              key={bucket.label}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div className="relative w-full" style={{ height: "calc(200px - 24px)" }}>
                <div
                  className="absolute bottom-0 left-1/2 w-3/4 -translate-x-1/2 rounded-t-xs"
                  style={{
                    height: `${pct}%`,
                    background:
                      "linear-gradient(to top, var(--rausch), var(--rausch-active))",
                    minHeight: bucket.amount > 0 ? 4 : 0,
                    transition: "height 0.4s ease",
                  }}
                />
              </div>
              <span className="whitespace-nowrap text-[10px] text-muted">
                {bucket.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function generateYTicks(max: number): number[] {
  if (max === 0) return [0, 250, 500, 750, 1000];
  const step = niceStep(max);
  const ticks: number[] = [];
  for (let v = 0; v <= max + step; v += step) {
    ticks.push(v);
    if (ticks.length >= 6) break;
  }
  return ticks;
}

function niceStep(max: number): number {
  const rough = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  if (norm <= 1) return mag;
  if (norm <= 2) return 2 * mag;
  if (norm <= 5) return 5 * mag;
  return 10 * mag;
}

function formatYLabel(value: number): string {
  if (value >= 1_00_000) return `${(value / 1_00_000).toFixed(0)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

/* ---------- Top Clients ---------- */

function TopClientsChart({ clients }: { clients: ClientRevenue[] }) {
  const max = Math.max(...clients.map((c) => c.revenue), 1);

  return (
    <div className="mt-6 space-y-3">
      {clients.map((client) => {
        const pct = (client.revenue / max) * 100;
        return (
          <div key={client.name}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink">{client.name}</span>
              <span className="font-semibold text-ink">
                {formatCurrency(client.revenue)}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-strong">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background:
                    "linear-gradient(to right, var(--rausch), var(--rausch-active))",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

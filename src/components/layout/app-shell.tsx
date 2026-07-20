"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  X,
} from "lucide-react";
import React, { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/domain/invoices/types";
import { getInvoiceTypeLabel } from "@/domain/invoices/document-type";
import { SyncStatus } from "./sync-status";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render the app shell on the login page or print preview page
  if (pathname === "/login" || pathname === "/print-preview") {
    return <>{children}</>;
  }

  if (!mounted) {
    return null;
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  /*
  function handleExportBackup() {
    try {
      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        invoices: JSON.parse(localStorage.getItem("invoice-gen:v1:invoices") || "[]"),
        customers: JSON.parse(localStorage.getItem("invoice-gen:v1:customers") || "[]"),
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ecobuilt_invoice_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export backup: " + (err as Error).message);
    }
  }

  function handleImportBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data || typeof data !== "object") {
          throw new Error("Invalid backup format");
        }

        if (!Array.isArray(data.invoices) || !Array.isArray(data.customers)) {
          throw new Error("Backup file must contain invoices and customers arrays");
        }

        const currentInvoices = JSON.parse(localStorage.getItem("invoice-gen:v1:invoices") || "[]");
        const currentCustomers = JSON.parse(localStorage.getItem("invoice-gen:v1:customers") || "[]");

        if (
          !window.confirm(
            `Are you sure you want to restore data? This will overwrite your existing ${currentInvoices.length} invoices and ${currentCustomers.length} customers.`,
          )
        ) {
          return;
        }

        localStorage.setItem("invoice-gen:v1:invoices", JSON.stringify(data.invoices));
        localStorage.setItem("invoice-gen:v1:customers", JSON.stringify(data.customers));

        alert("Data restored successfully! The page will now reload.");
        window.location.reload();
      } catch (err) {
        alert("Failed to import backup: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }
  */

  function handleExportCSV() {
    try {
      const allInvoices = JSON.parse(localStorage.getItem("invoice-gen:v1:invoices") || "[]");
      if (allInvoices.length === 0) {
        alert("No invoices to export.");
        return;
      }

      const headers = [
        "Invoice Number",
        "Invoice Type",
        "Issue Date",
        "Customer Name",
        "Customer GST",
        "Payment Status",
        "Payment Method",
        "Subtotal (INR)",
        "Discount (INR)",
        "Taxable Amount (INR)",
        "GST Amount (INR)",
        "Grand Total (INR)",
        "Amount Paid (INR)",
        "Balance Due (INR)",
      ];

      const csvRows = [
        headers.join(","),
        ...allInvoices.map((inv: Invoice) => {
          const row = [
            inv.invoiceNumber,
            getInvoiceTypeLabel(inv.invoiceType),
            inv.issueDate,
            `"${(inv.customerSnapshot.name || "Manual").replace(/"/g, '""')}"`,
            inv.customerSnapshot.gstNumber || "-",
            inv.paymentStatus,
            inv.paymentMethod,
            inv.totals.subtotal.toFixed(2),
            inv.totals.discount.toFixed(2),
            inv.totals.taxableAmount.toFixed(2),
            inv.totals.gst.toFixed(2),
            inv.totals.grandTotal.toFixed(2),
            inv.amountPaid.toFixed(2),
            inv.totals.balanceDue.toFixed(2),
          ];
          return row.join(",");
        }),
      ];

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ecobuilt_invoices_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export CSV: " + (err as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-body flex flex-col">
      <header className="app-chrome no-print sticky top-0 z-50 border-b border-hairline bg-white backdrop-blur">
        <div className="app-section flex h-20 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 text-ink">
            <Image
              src="/logo.svg"
              alt="Ecobuilt logo"
              width={40}
              height={40}
              className="rounded-md"
              priority
            />
            <span className="text-base font-semibold">OMM ECO BUILDTECH</span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex" aria-label="Primary">
            {navItems.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors",
                    active ? "bg-surface-soft text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <SyncStatus className="hidden sm:inline-flex" />

            <Button asChild className="hidden md:inline-flex">
              <Link href="/invoices/new">
                <FileText className="h-4 w-4" aria-hidden="true" />
                New invoice
              </Link>
            </Button>

            {/* Global Data Operations Icons */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Export CSV"
              type="button"
              onClick={handleExportCSV}
              title="Export CSV"
              className="hidden md:inline-flex text-muted hover:text-ink"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            </Button>

            {/* Commented out JSON Backup/Restore for now
            <Button
              variant="ghost"
              size="icon"
              aria-label="Backup JSON"
              type="button"
              onClick={handleExportBackup}
              title="Backup JSON"
              className="hidden md:inline-flex text-muted hover:text-ink"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
            </Button>

            <label
              className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-surface-soft cursor-pointer text-muted hover:text-ink transition-colors"
              title="Restore JSON"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
            */}

            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sign out"
              className="hidden md:inline-flex"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              className="md:hidden"
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              type="button"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile drawer backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile drawer content */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-72 bg-white p-6 shadow-xl transition-transform duration-300 md:hidden flex flex-col gap-6",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-ink">Menu</span>
          <div className="flex items-center gap-1">
            <SyncStatus />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close navigation"
              type="button"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <nav className="flex flex-col gap-2" aria-label="Mobile Primary">
          {navItems.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-full px-5 text-sm font-semibold transition-colors",
                  active ? "bg-surface-soft text-ink" : "text-muted hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-hairline pt-6 flex flex-col gap-3">
          <Button asChild className="w-full justify-center">
            <Link href="/invoices/new" onClick={() => setMobileMenuOpen(false)}>
              <FileText className="h-4 w-4" aria-hidden="true" />
              New invoice
            </Link>
          </Button>

          {/* Mobile drawer data backup & export */}
          <div className="border-b border-hairline-soft pb-4 mb-2">
            <Button
              variant="secondary"
              className="w-full h-11 text-xs flex gap-2 items-center justify-center rounded-md"
              onClick={() => {
                setMobileMenuOpen(false);
                handleExportCSV();
              }}
              title="Export CSV"
            >
              <FileSpreadsheet className="h-4 w-4 text-muted" aria-hidden="true" />
              <span className="text-xs text-body">Export CSV</span>
            </Button>
            {/* Commented out JSON Backup/Restore for now
            <Button
              variant="secondary"
              className="h-12 text-xs px-2 flex flex-col gap-1 items-center justify-center rounded-md"
              onClick={() => {
                setMobileMenuOpen(false);
                handleExportBackup();
              }}
              title="Backup JSON"
            >
              <Download className="h-4 w-4 text-muted" aria-hidden="true" />
              <span className="text-[9px] text-body">Backup</span>
            </Button>
            <label className="flex flex-col gap-1 items-center justify-center rounded-md font-semibold transition-colors bg-surface-soft hover:bg-surface-strong h-12 px-2 text-xs cursor-pointer border border-hairline">
              <Upload className="h-4 w-4 text-muted" aria-hidden="true" />
              <span className="text-[9px] font-medium text-body">Restore</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
            */}
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start text-muted hover:text-ink px-5 h-12 rounded-full animate-none"
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            disabled={loggingOut}
          >
            <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </div>

      <main className="min-w-0 flex-grow overflow-x-hidden">{children}</main>

      <footer className="no-print mt-auto border-t border-hairline-soft py-6 text-center text-xs text-muted">
        <div className="app-section flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p>© {new Date().getFullYear()} OMM ECO BUILDTECH. All rights reserved.</p>
          <p>
            Made with ❤️ by{" "}
            <span className="font-semibold text-ink">Subham</span> — Odisha, India
          </p>
        </div>
      </footer>
    </div>
  );
}

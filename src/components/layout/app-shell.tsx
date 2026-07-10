"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, Menu, Users } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-canvas text-body">
      <header className="app-chrome no-print sticky top-0 z-50 border-b border-hairline bg-white backdrop-blur">
        <div className="app-section flex h-20 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 text-ink">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rausch text-white">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold">Invoice Gen</span>
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
            <Button asChild>
              <Link href="/invoices/new">
                <FileText className="h-4 w-4" aria-hidden="true" />
                New invoice
              </Link>
            </Button>
            <Button
              className="md:hidden"
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              type="button"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}

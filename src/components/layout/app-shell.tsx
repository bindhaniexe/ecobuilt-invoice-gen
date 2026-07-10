"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't render the app shell on the login page
  if (pathname === "/login") {
    return <>{children}</>;
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
            <Button asChild className="hidden md:inline-flex">
              <Link href="/invoices/new">
                <FileText className="h-4 w-4" aria-hidden="true" />
                New invoice
              </Link>
            </Button>
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

      <main className="flex-grow">{children}</main>

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

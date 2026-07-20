"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, CloudOff, LogIn, RefreshCw, TriangleAlert } from "lucide-react";

import { DATA_CHANGED_EVENT } from "@/domain/storage/collection-store";
import { useSync, type SyncStatus as Status } from "@/hooks/use-sync";
import { cn } from "@/lib/utils";

const PRESENTATION: Record<
  Status,
  { label: string; icon: typeof Check; className: string; spin?: boolean }
> = {
  idle: { label: "Sync", icon: RefreshCw, className: "text-muted" },
  syncing: { label: "Syncing", icon: RefreshCw, className: "text-muted", spin: true },
  synced: { label: "Synced", icon: Check, className: "text-[#245536]" },
  offline: { label: "Offline", icon: CloudOff, className: "text-muted" },
  disabled: { label: "Local only", icon: CloudOff, className: "text-muted" },
  unauthorized: { label: "Sign in to sync", icon: LogIn, className: "text-[#c13515]" },
  error: { label: "Sync error", icon: TriangleAlert, className: "text-[#c13515]" },
};

/**
 * Renders the current sync state and, invisibly, drives background sync: it
 * mounts useSync and re-triggers a debounced sync whenever local data changes.
 * "Local only" means the server has no DATABASE_URL — the app works fully
 * offline and this is expected, not an error.
 */
export function SyncStatus({ className }: { className?: string }) {
  const router = useRouter();
  const { status, sync, requestSync } = useSync();

  useEffect(() => {
    function handleDataChanged() {
      requestSync();
    }
    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    return () =>
      window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
  }, [requestSync]);

  const { label, icon: Icon, className: tone, spin } = PRESENTATION[status];
  const interactive = status !== "disabled" && status !== "syncing";

  function handleClick() {
    if (!interactive) return;
    // An invalid/expired session can only be fixed by signing in again.
    if (status === "unauthorized") {
      router.push("/login");
      return;
    }
    void sync();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!interactive}
      title={
        status === "disabled"
          ? "Data is stored locally. Configure DATABASE_URL to sync."
          : status === "unauthorized"
            ? "Your session expired. Click to sign in again."
            : "Sync now"
      }
      aria-label={`Sync status: ${label}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        interactive ? "hover:bg-surface-soft" : "cursor-default",
        tone,
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", spin && "animate-spin")} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

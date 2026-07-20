"use client";

import { Check, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";

import { useSync, type SyncStatus as Status } from "@/hooks/use-sync";
import { cn } from "@/lib/utils";

const PRESENTATION: Record<
  Status,
  { label: string; icon: typeof Check; className: string; spin?: boolean }
> = {
  idle: { label: "Sync", icon: RefreshCw, className: "text-muted" },
  syncing: { label: "Syncing", icon: RefreshCw, className: "text-muted", spin: true },
  synced: { label: "Synced", icon: Check, className: "text-[#245536]" },
  disabled: { label: "Local only", icon: CloudOff, className: "text-muted" },
  error: { label: "Retry sync", icon: TriangleAlert, className: "text-[#c13515]" },
};

/**
 * Shows the current sync state and drives it: mounting useSync seeds+pulls on
 * load and pushes on every local save/delete. "Local only" means the server
 * has no DATABASE_URL configured.
 */
export function SyncStatus({ className }: { className?: string }) {
  const { status, sync } = useSync();

  const { label, icon: Icon, className: tone, spin } = PRESENTATION[status];
  const interactive = status !== "disabled" && status !== "syncing";

  return (
    <button
      type="button"
      onClick={() => interactive && void sync()}
      disabled={!interactive}
      title={
        status === "disabled"
          ? "Data is stored locally. Configure DATABASE_URL to sync."
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

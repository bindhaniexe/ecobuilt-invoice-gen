"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { runSync, type SyncOutcome } from "@/domain/sync/sync-engine";

export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "disabled"
  | "unauthorized"
  | "error";

const AUTO_SYNC_INTERVAL_MS = 60_000;
// Debounce post-mutation syncs so a burst of edits triggers a single push.
const MUTATION_DEBOUNCE_MS = 2_000;

/**
 * Drives background sync: on mount, when the tab comes online, on an interval,
 * and (debounced) after local mutations. Never throws — a failed cycle just
 * updates the status and retries next tick, so the app stays usable offline.
 */
export function useSync() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const inFlight = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sync = useCallback(async () => {
    if (inFlight.current) return;
    if (typeof window === "undefined") return;

    inFlight.current = true;
    setStatus((prev) => (prev === "disabled" ? prev : "syncing"));

    let outcome: SyncOutcome;
    try {
      outcome = await runSync(window.localStorage);
    } catch (error) {
      outcome = { status: "error", message: (error as Error).message };
    } finally {
      inFlight.current = false;
    }

    switch (outcome.status) {
      case "ok":
        setStatus("synced");
        setLastSyncedAt(new Date());
        break;
      case "offline":
        setStatus("offline");
        break;
      case "disabled":
        setStatus("disabled");
        break;
      case "unauthorized":
        setStatus("unauthorized");
        break;
      case "error":
        setStatus("error");
        break;
    }
  }, []);

  // Sync on mount.
  useEffect(() => {
    void sync();
  }, [sync]);

  // Sync when the connection is restored; mark offline when it drops.
  useEffect(() => {
    function handleOnline() {
      void sync();
    }
    function handleOffline() {
      setStatus((prev) => (prev === "disabled" ? prev : "offline"));
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sync]);

  // Periodic background sync to pull changes from other devices.
  useEffect(() => {
    const interval = setInterval(() => {
      void sync();
    }, AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sync]);

  // Debounced sync after local mutations, signalled via the data-changed event.
  const requestSync = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void sync();
    }, MUTATION_DEBOUNCE_MS);
  }, [sync]);

  return { status, lastSyncedAt, sync, requestSync };
}

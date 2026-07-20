"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  LOCAL_MUTATION_EVENT,
  type LocalMutation,
} from "@/domain/storage/collection-store";
import { pullAll, pushRecords, seedOnce } from "@/domain/sync/sync-engine";

export type SyncStatus = "idle" | "syncing" | "synced" | "disabled" | "error";

/**
 * Simple push-on-save / pull-on-load sync:
 *   - On mount: seed any pre-existing local data up once, then pull the server
 *     dataset down and merge it.
 *   - On each local mutation (save/delete): push just that record.
 *
 * No intervals, no offline bookkeeping — the app is always online behind login.
 */
export function useSync() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const busy = useRef(false);

  const apply = useCallback((result: { status: SyncStatus | "ok" }) => {
    if (result.status === "ok") {
      setStatus("synced");
      setLastSyncedAt(new Date());
    } else {
      setStatus(result.status as SyncStatus);
    }
  }, []);

  // Seed + pull on mount.
  const refresh = useCallback(async () => {
    if (typeof window === "undefined" || busy.current) return;
    busy.current = true;
    setStatus((prev) => (prev === "disabled" ? prev : "syncing"));
    try {
      const seed = await seedOnce(window.localStorage);
      if (seed.status === "disabled") {
        setStatus("disabled");
        return;
      }
      apply(await pullAll(window.localStorage));
    } finally {
      busy.current = false;
    }
  }, [apply]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Push each locally-saved/deleted record.
  useEffect(() => {
    function handleMutation(event: Event) {
      const detail = (event as CustomEvent<LocalMutation>).detail;
      if (!detail) return;

      const push =
        detail.collection === "customers"
          ? { customers: [detail.record], invoices: [] }
          : { customers: [], invoices: [detail.record] };

      setStatus((prev) => (prev === "disabled" ? prev : "syncing"));
      void pushRecords(push).then(apply);
    }

    window.addEventListener(LOCAL_MUTATION_EVENT, handleMutation);
    return () =>
      window.removeEventListener(LOCAL_MUTATION_EVENT, handleMutation);
  }, [apply]);

  return { status, lastSyncedAt, sync: refresh };
}

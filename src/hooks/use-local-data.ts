"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  Customer,
  Invoice,
  InvoiceFilters,
} from "@/domain/invoices/types";
import { LocalStorageCorruptionError } from "@/domain/storage/errors";
import {
  createLocalStorageCustomerRepository,
  createLocalStorageInvoiceRepository,
} from "@/domain/storage/local-storage-repositories";

function useBrowserStorage() {
  const [storage, setStorage] = useState<Storage | null>(null);

  useEffect(() => {
    setStorage(window.localStorage);
  }, []);

  return storage;
}

export function useInvoices(filters: InvoiceFilters = {}) {
  const query = filters.query ?? "";
  const status = filters.status ?? "all";
  const storage = useBrowserStorage();
  const repository = useMemo(
    () => (storage ? createLocalStorageInvoiceRepository(storage) : null),
    [storage],
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LocalStorageCorruptionError | Error | null>(
    null,
  );

  const refresh = useCallback(async () => {
    if (!repository) return;
    setLoading(true);
    try {
      setInvoices(await repository.search({ query, status }));
      setError(null);
    } catch (caught) {
      setError(caught as Error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [query, repository, status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    invoices,
    loading,
    error,
    ready: Boolean(repository),
    repository,
    refresh,
    async remove(id: string) {
      if (!repository) return;
      await repository.delete(id);
      await refresh();
    },
    async reset() {
      if (!repository) return;
      await repository.reset();
      await refresh();
    },
  };
}

export function useCustomers(query = "") {
  const storage = useBrowserStorage();
  const repository = useMemo(
    () => (storage ? createLocalStorageCustomerRepository(storage) : null),
    [storage],
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LocalStorageCorruptionError | Error | null>(
    null,
  );

  const refresh = useCallback(async () => {
    if (!repository) return;
    setLoading(true);
    try {
      setCustomers(query ? await repository.search(query) : await repository.list());
      setError(null);
    } catch (caught) {
      setError(caught as Error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [query, repository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    customers,
    loading,
    error,
    ready: Boolean(repository),
    repository,
    refresh,
    async reset() {
      if (!repository) return;
      await repository.reset();
      await refresh();
    },
  };
}

import { z } from "zod";

import { customerSchema, invoiceSchema } from "@/domain/invoices/schemas";

/**
 * Wire contract for /api/sync.
 *
 * - POST pushes changed records (upserted server-side with last-write-wins).
 * - GET returns the full dataset (including tombstones) for the client to
 *   merge on load.
 *
 * No cursor or dirty tracking: the app is always online behind a login, so
 * "push on save, pull on load" keeps devices in sync without offline bookkeeping.
 */

export const syncPushSchema = z.object({
  customers: z.array(customerSchema).default([]),
  invoices: z.array(invoiceSchema).default([]),
});

export const syncPullSchema = z.object({
  customers: z.array(customerSchema).default([]),
  invoices: z.array(invoiceSchema).default([]),
});

export type SyncPush = z.infer<typeof syncPushSchema>;
export type SyncPull = z.infer<typeof syncPullSchema>;

import { z } from "zod";

import { customerSchema, invoiceSchema } from "@/domain/invoices/schemas";

/**
 * The wire contract between the client sync engine and POST /api/sync.
 *
 * A single round-trip both pushes local changes and pulls remote ones:
 *   1. The client sends every locally-dirty record (including tombstones) plus
 *      its `cursor` — the server-clock watermark from its previous sync.
 *   2. The server applies last-write-wins upserts, then returns every record
 *      changed since `cursor` and a fresh `cursor` for next time.
 */

export const syncRequestSchema = z.object({
  /**
   * Server-clock ISO timestamp from the client's previous sync. Null/undefined
   * on first sync, which pulls the entire dataset.
   */
  cursor: z.string().datetime().nullish(),
  customers: z.array(customerSchema).default([]),
  invoices: z.array(invoiceSchema).default([]),
});

export const syncResponseSchema = z.object({
  /** New server-clock watermark to send back on the next sync. */
  cursor: z.string().datetime(),
  customers: z.array(customerSchema).default([]),
  invoices: z.array(invoiceSchema).default([]),
});

export type SyncRequest = z.infer<typeof syncRequestSchema>;
export type SyncResponse = z.infer<typeof syncResponseSchema>;

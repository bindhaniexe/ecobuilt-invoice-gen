import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import type { Customer, Invoice } from "@/domain/invoices/types";

/**
 * Both tables follow the same shape: the full domain record lives in a JSONB
 * `data` column (so the schema never drifts from the TypeScript types), while a
 * few columns are lifted out for sync bookkeeping.
 *
 * - `updatedAt` mirrors the record's own client-clock `updatedAt` and drives
 *   last-write-wins conflict resolution.
 * - `deletedAt` is the tombstone marker so deletes propagate across devices.
 * - `serverUpdatedAt` is a server-clock stamp set on every upsert. It is the
 *   pull cursor: clients ask for "everything with serverUpdatedAt greater than
 *   my last cursor", which sidesteps client clock skew between devices.
 */
export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    data: jsonb("data").$type<Customer>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    serverUpdatedAt: timestamp("server_updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    serverUpdatedAtIdx: index("customers_server_updated_at_idx").on(
      table.serverUpdatedAt,
    ),
  }),
);

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    data: jsonb("data").$type<Invoice>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    serverUpdatedAt: timestamp("server_updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    serverUpdatedAtIdx: index("invoices_server_updated_at_idx").on(
      table.serverUpdatedAt,
    ),
  }),
);

/** Marker kept for parity with drizzle tooling / future raw SQL use. */
export const NOW = sql`now()`;

export type CustomerRow = typeof customers.$inferSelect;
export type InvoiceRow = typeof invoices.$inferSelect;

import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { getDb, isDatabaseConfigured } from "@/db/client";
import { customers, invoices } from "@/db/schema";
import type { Customer, Invoice } from "@/domain/invoices/types";
import { syncPushSchema, type SyncPull } from "@/domain/sync/types";

// Uses the Neon serverless driver; keep it on the Node runtime.
export const runtime = "nodejs";

function disabled() {
  return NextResponse.json(
    { error: "Sync is not configured (DATABASE_URL unset)." },
    { status: 503 },
  );
}

/**
 * Access is gated by the login middleware (same as /api/pdf) — there is no
 * per-request auth here, which is why sync no longer 401s on a stale cookie.
 */

/** GET — return the full dataset (including tombstones) for the client merge. */
export async function GET() {
  if (!isDatabaseConfigured()) return disabled();
  const db = getDb();
  if (!db) return disabled();

  const [allCustomers, allInvoices] = await Promise.all([
    db.select().from(customers),
    db.select().from(invoices),
  ]);

  const body: SyncPull = {
    customers: allCustomers.map((row) => row.data as Customer),
    invoices: allInvoices.map((row) => row.data as Invoice),
  };

  return NextResponse.json(body);
}

/** POST — upsert the pushed records with last-write-wins on updatedAt. */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return disabled();
  const db = getDb();
  if (!db) return disabled();

  let push;
  try {
    push = syncPushSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: `Invalid sync payload: ${(error as Error).message}` },
      { status: 400 },
    );
  }

  if (push.customers.length) {
    await db
      .insert(customers)
      .values(
        push.customers.map((record) => ({
          id: record.id,
          data: record,
          updatedAt: new Date(record.updatedAt),
          deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        })),
      )
      .onConflictDoUpdate({
        target: customers.id,
        set: {
          data: sql`excluded.data`,
          updatedAt: sql`excluded.updated_at`,
          deletedAt: sql`excluded.deleted_at`,
          serverUpdatedAt: sql`clock_timestamp()`,
        },
        setWhere: sql`${customers.updatedAt} < excluded.updated_at`,
      });
  }

  if (push.invoices.length) {
    await db
      .insert(invoices)
      .values(
        push.invoices.map((record) => ({
          id: record.id,
          data: record,
          updatedAt: new Date(record.updatedAt),
          deletedAt: record.deletedAt ? new Date(record.deletedAt) : null,
        })),
      )
      .onConflictDoUpdate({
        target: invoices.id,
        set: {
          data: sql`excluded.data`,
          updatedAt: sql`excluded.updated_at`,
          deletedAt: sql`excluded.deleted_at`,
          serverUpdatedAt: sql`clock_timestamp()`,
        },
        setWhere: sql`${invoices.updatedAt} < excluded.updated_at`,
      });
  }

  return NextResponse.json({ ok: true });
}

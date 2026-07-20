import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { gt, sql } from "drizzle-orm";

import { getDb, isDatabaseConfigured } from "@/db/client";
import { customers, invoices } from "@/db/schema";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import type { Customer, Invoice } from "@/domain/invoices/types";
import { syncRequestSchema, type SyncResponse } from "@/domain/sync/types";

// lib/auth uses Node's crypto, so this route must run on the Node runtime.
export const runtime = "nodejs";

async function isAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  return Boolean(token) && verifySessionToken(token as string);
}

/**
 * Cursor correctness: we stamp `server_updated_at = clock_timestamp()` on every
 * upsert and return every row with `server_updated_at > cursor`. The new cursor
 * is the max `server_updated_at` observed. This is a wall-clock watermark, so a
 * concurrent commit whose timestamp predates the watermark but becomes visible
 * after our read could be missed until it changes again — an accepted trade-off
 * for a single-company tool with a handful of devices (merges are idempotent).
 */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Sync is not configured (DATABASE_URL unset)." },
      { status: 503 },
    );
  }

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Sync unavailable." }, { status: 503 });
  }

  let payload;
  try {
    payload = syncRequestSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: `Invalid sync payload: ${(error as Error).message}` },
      { status: 400 },
    );
  }

  // Push: last-write-wins upserts. On conflict we only overwrite when the
  // incoming record is strictly newer, and re-stamp the server clock.
  if (payload.customers.length) {
    await db
      .insert(customers)
      .values(
        payload.customers.map((record) => ({
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

  if (payload.invoices.length) {
    await db
      .insert(invoices)
      .values(
        payload.invoices.map((record) => ({
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

  // Pull: everything changed since the caller's cursor (their own just-pushed
  // rows included — the client merge is idempotent).
  const since = payload.cursor ? new Date(payload.cursor) : new Date(0);

  const [changedCustomers, changedInvoices] = await Promise.all([
    db.select().from(customers).where(gt(customers.serverUpdatedAt, since)),
    db.select().from(invoices).where(gt(invoices.serverUpdatedAt, since)),
  ]);

  const serverTimes = [
    ...changedCustomers.map((row) => row.serverUpdatedAt.getTime()),
    ...changedInvoices.map((row) => row.serverUpdatedAt.getTime()),
  ];
  const newCursor = serverTimes.length
    ? new Date(Math.max(...serverTimes)).toISOString()
    : (payload.cursor ?? new Date(0).toISOString());

  const body: SyncResponse = {
    cursor: newCursor,
    customers: changedCustomers.map((row) => row.data as Customer),
    invoices: changedInvoices.map((row) => row.data as Invoice),
  };

  return NextResponse.json(body);
}

import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium-min";

/**
 * Lightweight health-check for the PDF subsystem.
 * Verifies that @sparticuz/chromium-min can resolve a Chromium executable path.
 *
 * GET /api/pdf/health
 */
const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar";

export async function GET() {
  try {
    const isLocalDev = process.env.NODE_ENV === "development";

    if (isLocalDev) {
      return NextResponse.json({
        status: "ok",
        environment: "development",
        note: "Chromium resolution skipped in local dev",
      });
    }

    const executablePath = await chromium.executablePath(CHROMIUM_PACK_URL);

    return NextResponse.json({
      status: "ok",
      environment: "production",
      chromiumPath: executablePath,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

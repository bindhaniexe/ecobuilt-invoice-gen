import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import fs from "fs";

/**
 * Chromium binary hosted on GitHub by @Sparticuz/chromium.
 * @sparticuz/chromium-min downloads this at cold-start instead of bundling it,
 * which avoids the "input directory does not exist" error with pnpm + Vercel.
 *
 * Pin the pack version to match the @sparticuz/chromium-min major version.
 * See https://github.com/Sparticuz/chromium/releases for available packs.
 */
const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar";

function getLocalChromePath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH;
  }

  const candidatePaths = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Chromium\\Application\\chrome.exe",
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export async function POST(request: Request) {
  let browser;
  try {
    const invoiceData = await request.json();

    // Determine the base URL from request headers
    const host = request.headers.get("host") || "localhost:3000";
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;
    const targetUrl = `${baseUrl}/print-preview`;

    // Forward the session cookie so Puppeteer can authenticate
    const sessionCookie = request.headers.get("cookie") ?? "";

    const isLocalDev = process.env.NODE_ENV === "development";
    const localExecutablePath = getLocalChromePath();

    if (isLocalDev && localExecutablePath) {
      // In local development with a local Chrome installation:
      browser = await puppeteer.launch({
        headless: true,
        executablePath: localExecutablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
        defaultViewport: { width: 1200, height: 1600, deviceScaleFactor: 2 },
      });
    } else {
      // Production / Serverless environment (Vercel, AWS, etc.):
      // chromium-min downloads the binary from the pack URL at cold-start
      const executablePath = await chromium.executablePath(CHROMIUM_PACK_URL);
      console.log("[PDF] Chromium executable resolved:", executablePath);

      browser = await puppeteer.launch({
        args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
        defaultViewport: { width: 1200, height: 1600, deviceScaleFactor: 2 },
        executablePath,
        headless: true,
      });
    }

    const page = await browser.newPage();

    // Forward session cookie so the renderer can access authenticated endpoints
    if (sessionCookie) {
      await page.setExtraHTTPHeaders({ cookie: sessionCookie });
    }

    // Set viewport size
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

    // Navigate to print-preview
    await page.goto(targetUrl, { waitUntil: "networkidle0", timeout: 20000 });

    // Wait for the page to be ready
    await page.waitForFunction(() => window.isPrintPreviewReady === true, {
      timeout: 10000,
    });

    // Inject data and render
    await page.evaluate((data) => {
      window.renderInvoice?.(data);
    }, invoiceData);

    // Wait for the .print-area selector to be rendered
    await page.waitForSelector(".print-area", { timeout: 10000 });

    /**
     * Wait until Inter has actually loaded the ₹ glyph (U+20B9).
     *
     * Strategy: measure the width of '₹' rendered with Inter vs. a
     * monospace-only fallback. Once they differ, Inter is active and
     * the glyph exists. We retry for up to 5 s before proceeding anyway.
     */
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const MAX_WAIT = 5000;
        const start = Date.now();

        function check() {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;

          // Measure ₹ in Inter (our self-hosted font)
          ctx.font = "16px Inter";
          const interWidth = ctx.measureText("\u20B9").width;

          // Measure ₹ in a monospace fallback that definitely lacks ₹
          ctx.font = "16px monospace";
          const monoWidth = ctx.measureText("\u20B9").width;

          // When Inter is loaded its glyph width will differ from monospace
          if (interWidth !== monoWidth || Date.now() - start > MAX_WAIT) {
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        }

        check();
      });
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    await browser.close();

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoiceData.invoiceNumber || "export"}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    if (browser) {
      await browser.close().catch(() => {});
    }
    return NextResponse.json(
      {
        error: `Failed to generate PDF: ${(error as Error).message}`,
        code: "SERVER_PUPPETEER_UNAVAILABLE",
      },
      { status: 503 }
    );
  }
}

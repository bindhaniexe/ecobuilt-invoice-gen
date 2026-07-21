import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import fs from "fs";

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
      });
    } else {
      // Production / Serverless environment (Vercel, AWS, etc.):
      const executablePath = await chromium.executablePath();
      browser = await puppeteer.launch({
        args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
        defaultViewport: { width: 1200, height: 1600, deviceScaleFactor: 2 },
        executablePath,
        headless: true,
      });
    }

    const page = await browser.newPage();

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

    // Give it a tiny bit of time to make sure any webfonts are fully drawn
    await new Promise((resolve) => setTimeout(resolve, 500));

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

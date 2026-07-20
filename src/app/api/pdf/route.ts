import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(request: Request) {
  try {
    const invoiceData = await request.json();

    // Determine the base URL from request headers
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;
    const targetUrl = `${baseUrl}/print-preview`;

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Set viewport size
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

    // Navigate to print-preview
    await page.goto(targetUrl, { waitUntil: "networkidle0" });

    // Wait for the page to be ready
    await page.waitForFunction(() => window.isPrintPreviewReady === true);

    // Inject data and render
    await page.evaluate((data) => {
      window.renderInvoice?.(data);
    }, invoiceData);

    // Wait for the .print-area selector to be rendered
    await page.waitForSelector(".print-area");

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
    return NextResponse.json(
      { error: `Failed to generate PDF: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

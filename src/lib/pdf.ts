"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import React from "react";
import { createRoot } from "react-dom/client";
import type { Invoice } from "@/domain/invoices/types";
import { InvoicePreview } from "@/components/invoices/invoice-template";

export async function generateClientSidePdfBlob(
  invoice: Invoice
): Promise<Blob> {
  const tempContainer = document.createElement("div");
  tempContainer.style.position = "absolute";
  tempContainer.style.left = "-9999px";
  tempContainer.style.top = "-9999px";
  tempContainer.style.width = "210mm";
  tempContainer.style.backgroundColor = "#ffffff";
  tempContainer.style.transform = "none";
  document.body.appendChild(tempContainer);

  const printRef = React.createRef<HTMLDivElement>();
  const rootToUnmount = createRoot(tempContainer);

  try {
    await new Promise<void>((resolve) => {
      rootToUnmount.render(
        React.createElement(InvoicePreview, { invoice, printRef })
      );
      setTimeout(resolve, 400);
    });

    const pageElements = Array.from(
      tempContainer.querySelectorAll<HTMLElement>(".invoice-page")
    );
    const targetsToCapture =
      pageElements.length > 0 ? pageElements : [tempContainer];

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    for (let i = 0; i < targetsToCapture.length; i++) {
      const target = targetsToCapture[i];
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    }

    return pdf.output("blob");
  } finally {
    setTimeout(() => {
      try {
        rootToUnmount.unmount();
        if (tempContainer.parentNode) {
          tempContainer.parentNode.removeChild(tempContainer);
        }
      } catch {
        // Ignore unmount cleanup errors
      }
    }, 100);
  }
}

/**
 * Attempt to generate a PDF via the server-side Puppeteer route.
 * Retries once on failure (cold-start resilience) before returning null.
 */
async function fetchServerPdf(invoice: Invoice, retries = 1): Promise<Blob | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoice),
      });

      if (response.ok) {
        return await response.blob();
      }

      const err = await response.json().catch(() => ({ error: "Server PDF route error" }));
      console.warn(
        `[PDF] Server attempt ${attempt + 1}/${retries + 1} failed (${response.status}):`,
        err.error
      );
    } catch (error) {
      console.warn(
        `[PDF] Server attempt ${attempt + 1}/${retries + 1} network error:`,
        error
      );
    }

    // Wait before retrying (skip wait on last attempt)
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  return null;
}

export async function downloadInvoicePdf(
  invoice: Invoice,
  filename: string,
  _element?: HTMLElement | null
): Promise<void> {
  let blob: Blob;

  const serverBlob = await fetchServerPdf(invoice);
  if (serverBlob) {
    blob = serverBlob;
  } else {
    console.warn("[PDF] All server attempts failed. Falling back to client PDF.");
    blob = await generateClientSidePdfBlob(invoice);
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function createInvoicePdfFile(
  invoice: Invoice,
  filename: string,
  _element?: HTMLElement | null
): Promise<File> {
  let blob: Blob;

  const serverBlob = await fetchServerPdf(invoice);
  if (serverBlob) {
    blob = serverBlob;
  } else {
    console.warn("[PDF] All server attempts failed. Falling back to client PDF.");
    blob = await generateClientSidePdfBlob(invoice);
  }

  return new File([blob], `${filename}.pdf`, { type: "application/pdf" });
}

export function canShareInvoicePdf(file: File): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }

  if (typeof navigator.canShare !== "function") {
    return true;
  }

  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

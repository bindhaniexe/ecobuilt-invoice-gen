"use client";

import type { Invoice } from "@/domain/invoices/types";

export async function downloadInvoicePdf(
  invoice: Invoice,
  filename: string,
): Promise<void> {
  const response = await fetch("/api/pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(invoice),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Failed to download PDF" }));
    throw new Error(err.error || "Failed to download PDF");
  }

  const blob = await response.blob();
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
): Promise<File> {
  const response = await fetch("/api/pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(invoice),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Failed to generate PDF" }));
    throw new Error(err.error || "Failed to generate PDF");
  }

  const blob = await response.blob();
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

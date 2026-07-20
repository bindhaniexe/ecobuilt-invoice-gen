"use client";

import { useEffect, useRef, useState } from "react";
import type { Invoice } from "@/domain/invoices/types";
import { InvoicePreview } from "@/components/invoices/invoice-template";

// Bridge used by the Puppeteer PDF renderer (src/app/api/pdf/route.ts).
declare global {
  interface Window {
    renderInvoice?: (data: Invoice) => void;
    isPrintPreviewReady?: boolean;
  }
}

export default function PrintPreviewPage() {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Expose the render function to Puppeteer
    window.renderInvoice = (data: Invoice) => {
      setInvoice(data);
    };
    // Expose ready flag
    window.isPrintPreviewReady = true;
  }, []);

  if (!invoice) {
    return (
      <div className="flex h-screen items-center justify-center text-muted">
        Waiting for invoice data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <InvoicePreview invoice={invoice} printRef={printRef} />
    </div>
  );
}

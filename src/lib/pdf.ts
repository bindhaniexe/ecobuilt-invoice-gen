"use client";

async function renderInvoicePdf(printRoot: HTMLElement) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  await document.fonts.ready;

  const pages = Array.from(
    printRoot.querySelectorAll<HTMLElement>(".invoice-page"),
  );
  const targetPages = pages.length ? pages : [printRoot];
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  for (const [index, page] of targetPages.entries()) {
    const canvas = await html2canvas(page, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: page.scrollWidth,
      windowHeight: page.scrollHeight,
    });

    const image = canvas.toDataURL("image/png", 1);
    if (index > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(image, "PNG", 0, 0, 210, 297, undefined, "FAST");
  }

  return pdf;
}

export async function downloadInvoicePdf(
  printRoot: HTMLElement,
  filename: string,
): Promise<void> {
  const pdf = await renderInvoicePdf(printRoot);
  pdf.save(`${filename}.pdf`);
}

export async function createInvoicePdfFile(
  printRoot: HTMLElement,
  filename: string,
): Promise<File> {
  const pdf = await renderInvoicePdf(printRoot);
  const blob = pdf.output("blob");
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

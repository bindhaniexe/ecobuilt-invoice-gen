"use client";

export async function downloadInvoicePdf(
  printRoot: HTMLElement,
  filename: string,
): Promise<void> {
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

  pdf.save(`${filename}.pdf`);
}

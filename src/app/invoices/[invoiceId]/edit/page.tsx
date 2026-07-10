import { InvoiceEditorPage } from "@/components/invoices/invoice-editor-page";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  return <InvoiceEditorPage invoiceId={invoiceId} />;
}

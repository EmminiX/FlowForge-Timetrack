import type { AppSettings, Client, Currency, InvoiceWithDetails } from '../types';
import { isTauriRuntime } from '../lib/platform';
import { assertSafeUserFilePath } from '../lib/safeFilePaths';
import { clientService } from './clientService';
import { invoiceService } from './invoiceService';
import { settingsService } from './settingsService';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

interface BuildInvoicePdfInput {
  invoice: InvoiceWithDetails;
  clientCurrency: Currency;
  settings: AppSettings;
}

interface ExportInvoicePdfDependencies {
  getInvoiceById?: (invoiceId: string) => Promise<InvoiceWithDetails | null>;
  getClientById?: (clientId: string) => Promise<Client | null>;
  loadSettings?: () => Promise<AppSettings>;
  buildPdf?: (input: BuildInvoicePdfInput) => Promise<ArrayBuffer>;
  savePdf?: (filename: string, pdfBytes: ArrayBuffer) => Promise<void>;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

async function buildInvoicePdf({
  invoice,
  clientCurrency,
  settings,
}: BuildInvoicePdfInput): Promise<ArrayBuffer> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const currencySymbol = CURRENCY_SYMBOLS[clientCurrency] || '€';
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('INVOICE', pageWidth - margin, y, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  y += 8;
  doc.text(`#${invoice.invoiceNumber}`, pageWidth - margin, y, { align: 'right' });

  if (settings.businessName) {
    y = 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(settings.businessName, margin, y);
    y += 6;
  } else {
    y = 30;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  [settings.businessEmail, settings.businessPhone, settings.businessWebsite]
    .filter(Boolean)
    .forEach((line) => {
      doc.text(line, margin, y);
      y += 5;
    });

  y = Math.max(y + 14, 58);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To', margin, y);
  doc.text('Invoice Details', pageWidth / 2, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.text(invoice.clientName, margin, y);
  doc.text(`Issued: ${formatDate(invoice.issueDate)}`, pageWidth / 2, y);
  y += 5;
  if (invoice.clientEmail) {
    doc.text(invoice.clientEmail, margin, y);
  }
  doc.text(`Due: ${formatDate(invoice.dueDate)}`, pageWidth / 2, y);
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.text('Description', margin, y);
  doc.text('Qty', pageWidth - 72, y, { align: 'right' });
  doc.text('Rate', pageWidth - 44, y, { align: 'right' });
  doc.text('Amount', pageWidth - margin, y, { align: 'right' });
  y += 4;
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  invoice.lineItems.forEach((item) => {
    const amount = item.quantity * item.unitPrice;
    const description = doc.splitTextToSize(item.description, pageWidth - 112)[0] || item.description;
    doc.text(description, margin, y);
    doc.text(String(item.quantity), pageWidth - 72, y, { align: 'right' });
    doc.text(`${currencySymbol}${item.unitPrice.toFixed(2)}`, pageWidth - 44, y, {
      align: 'right',
    });
    doc.text(`${currencySymbol}${amount.toFixed(2)}`, pageWidth - margin, y, {
      align: 'right',
    });
    y += 7;
  });

  y += 5;
  doc.line(pageWidth - 82, y, pageWidth - margin, y);
  y += 7;
  doc.text('Subtotal', pageWidth - 72, y);
  doc.text(`${currencySymbol}${invoice.subtotal.toFixed(2)}`, pageWidth - margin, y, {
    align: 'right',
  });
  y += 6;

  if (invoice.taxRate > 0) {
    doc.text(`Tax ${(invoice.taxRate * 100).toFixed(1)}%`, pageWidth - 72, y);
    doc.text(`${currencySymbol}${invoice.taxAmount.toFixed(2)}`, pageWidth - margin, y, {
      align: 'right',
    });
    y += 6;
  }

  if (invoice.downPayment > 0) {
    doc.text('Down Payment', pageWidth - 72, y);
    doc.text(`-${currencySymbol}${invoice.downPayment.toFixed(2)}`, pageWidth - margin, y, {
      align: 'right',
    });
    y += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.text(invoice.downPayment > 0 ? 'Amount Due' : 'Total', pageWidth - 72, y);
  doc.text(`${currencySymbol}${invoice.total.toFixed(2)}`, pageWidth - margin, y, {
    align: 'right',
  });

  if (invoice.notes) {
    y += 16;
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(invoice.notes, pageWidth - margin * 2), margin, y);
  }

  return doc.output('arraybuffer');
}

async function savePdf(filename: string, pdfBytes: ArrayBuffer): Promise<void> {
  if (isTauriRuntime()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const filePath = await save({
      defaultPath: filename,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });

    if (!filePath) return;

    const safeFilePath = await assertSafeUserFilePath(filePath, '.pdf', 'Invoice PDF export');
    await writeFile(safeFilePath, new Uint8Array(pdfBytes));
    return;
  }

  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportInvoicePdfById(
  invoiceId: string,
  dependencies: ExportInvoicePdfDependencies = {},
): Promise<void> {
  const invoice = await (dependencies.getInvoiceById || invoiceService.getById.bind(invoiceService))(
    invoiceId,
  );

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const client = await (dependencies.getClientById || clientService.getById.bind(clientService))(
    invoice.clientId,
  );
  const settings = await (dependencies.loadSettings || settingsService.load.bind(settingsService))();
  const pdfBytes = await (dependencies.buildPdf || buildInvoicePdf)({
    invoice,
    clientCurrency: client?.currency || 'EUR',
    settings,
  });

  await (dependencies.savePdf || savePdf)(`${invoice.invoiceNumber}.pdf`, pdfBytes);
}

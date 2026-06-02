import { describe, expect, it, vi } from 'vitest';
import type { Client, InvoiceWithDetails } from '../types';
import { DEFAULT_SETTINGS } from '../types/settings';
import { exportInvoicePdfById } from './invoicePdfService';

const invoice: InvoiceWithDetails = {
  id: 'invoice-1',
  clientId: 'client-1',
  invoiceNumber: 'INV-2026-0001',
  issueDate: '2026-06-01T00:00:00.000Z',
  dueDate: '2026-07-01T00:00:00.000Z',
  status: 'sent',
  notes: 'Thank you',
  taxRate: 0.2,
  downPayment: 10,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  clientName: 'Acme Studio',
  clientEmail: 'accounts@acme.test',
  clientPhone: '',
  clientAddress: '',
  clientVatNumber: '',
  lineItems: [
    {
      id: 'line-1',
      invoiceId: 'invoice-1',
      description: 'Design system work',
      quantity: 2,
      unitPrice: 125,
    },
  ],
  subtotal: 250,
  taxAmount: 50,
  total: 290,
};

const client: Client = {
  id: 'client-1',
  name: 'Acme Studio',
  email: 'accounts@acme.test',
  address: '',
  phone: '',
  vatNumber: '',
  hourlyRate: 125,
  currency: 'GBP',
  notes: '',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('exportInvoicePdfById', () => {
  it('loads invoice details and client currency before saving the PDF', async () => {
    const pdfBytes = new ArrayBuffer(8);
    const buildPdf = vi.fn().mockResolvedValue(pdfBytes);
    const savePdf = vi.fn().mockResolvedValue(undefined);

    await exportInvoicePdfById('invoice-1', {
      getInvoiceById: vi.fn().mockResolvedValue(invoice),
      getClientById: vi.fn().mockResolvedValue(client),
      loadSettings: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
      buildPdf,
      savePdf,
    });

    expect(buildPdf).toHaveBeenCalledWith({
      invoice,
      clientCurrency: 'GBP',
      settings: DEFAULT_SETTINGS,
    });
    expect(savePdf).toHaveBeenCalledWith('INV-2026-0001.pdf', pdfBytes);
  });

  it('throws when the invoice cannot be found', async () => {
    await expect(
      exportInvoicePdfById('missing-invoice', {
        getInvoiceById: vi.fn().mockResolvedValue(null),
      }),
    ).rejects.toThrow('Invoice not found');
  });
});

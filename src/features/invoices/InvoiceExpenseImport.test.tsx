import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../types/settings';
import { InvoicesList } from './InvoicesList';

const serviceMocks = vi.hoisted(() => ({
  invoiceGetAll: vi.fn(),
  invoiceGetAllForNumbering: vi.fn(),
  invoiceCreate: vi.fn(),
  invoiceUpdate: vi.fn(),
  invoiceReplaceLineItems: vi.fn(),
  invoiceDelete: vi.fn(),
  clientGetAll: vi.fn(),
  projectGetByClientId: vi.fn(),
  timeEntryGetUnbilledByProject: vi.fn(),
  timeEntryMarkAsBilled: vi.fn(),
  settingsLoad: vi.fn(),
  productGetAll: vi.fn(),
  downPaymentGetTotalByClientId: vi.fn(),
  expenseGetUnbilledByClientId: vi.fn(),
  expenseMarkAsBilled: vi.fn(),
  invoicePaymentRecordEvent: vi.fn(),
}));

vi.mock('../../services', () => ({
  invoiceService: {
    getAll: serviceMocks.invoiceGetAll,
    getAllForNumbering: serviceMocks.invoiceGetAllForNumbering,
    create: serviceMocks.invoiceCreate,
    update: serviceMocks.invoiceUpdate,
    replaceLineItems: serviceMocks.invoiceReplaceLineItems,
    delete: serviceMocks.invoiceDelete,
  },
  clientService: {
    getAll: serviceMocks.clientGetAll,
  },
  projectService: {
    getByClientId: serviceMocks.projectGetByClientId,
  },
  timeEntryService: {
    getUnbilledByProject: serviceMocks.timeEntryGetUnbilledByProject,
    markAsBilled: serviceMocks.timeEntryMarkAsBilled,
  },
  settingsService: {
    load: serviceMocks.settingsLoad,
  },
  productService: {
    getAll: serviceMocks.productGetAll,
  },
  downPaymentService: {
    getTotalByClientId: serviceMocks.downPaymentGetTotalByClientId,
  },
  expenseService: {
    getUnbilledByClientId: serviceMocks.expenseGetUnbilledByClientId,
    markAsBilled: serviceMocks.expenseMarkAsBilled,
  },
  invoicePaymentService: {
    recordEvent: serviceMocks.invoicePaymentRecordEvent,
  },
}));

describe('invoice expense import', () => {
  beforeEach(() => {
    serviceMocks.invoiceGetAll.mockResolvedValue([]);
    serviceMocks.invoiceGetAllForNumbering.mockResolvedValue([]);
    serviceMocks.invoiceCreate.mockResolvedValue({
      id: 'invoice-1',
      clientId: 'client-1',
      invoiceNumber: 'INV-2026-0001',
      issueDate: '2026-06-02',
      dueDate: '2026-07-02',
      status: 'draft',
      notes: '',
      taxRate: 0.23,
      downPayment: 0,
      createdAt: '2026-06-02T00:00:00.000Z',
      updatedAt: '2026-06-02T00:00:00.000Z',
    });
    serviceMocks.invoiceUpdate.mockResolvedValue(null);
    serviceMocks.invoiceReplaceLineItems.mockResolvedValue(undefined);
    serviceMocks.invoiceDelete.mockResolvedValue(true);
    serviceMocks.clientGetAll.mockResolvedValue([
      {
        id: 'client-1',
        name: 'Acme Studio',
        email: '',
        address: '',
        phone: '',
        vatNumber: '',
        hourlyRate: 95,
        currency: 'EUR',
        notes: '',
        createdAt: '2026-06-02T09:00:00.000Z',
        updatedAt: '2026-06-02T09:00:00.000Z',
      },
    ]);
    serviceMocks.projectGetByClientId.mockResolvedValue([]);
    serviceMocks.timeEntryGetUnbilledByProject.mockResolvedValue([]);
    serviceMocks.timeEntryMarkAsBilled.mockResolvedValue(undefined);
    serviceMocks.settingsLoad.mockResolvedValue(DEFAULT_SETTINGS);
    serviceMocks.productGetAll.mockResolvedValue([]);
    serviceMocks.downPaymentGetTotalByClientId.mockResolvedValue(0);
    serviceMocks.expenseGetUnbilledByClientId.mockResolvedValue([
      {
        id: 'expense-1',
        clientId: 'client-1',
        projectId: 'project-1',
        description: 'Stock photo license',
        amount: 49.5,
        expenseDate: '2026-06-02',
        receiptPath: '/demo/receipts/stock-photo.pdf',
        isBillable: true,
        isBilled: false,
        invoiceId: null,
        notes: '',
        createdAt: '2026-06-02T12:00:00.000Z',
        updatedAt: '2026-06-02T12:00:00.000Z',
        clientName: 'Acme Studio',
        projectName: 'Brand Refresh',
      },
    ]);
    serviceMocks.expenseMarkAsBilled.mockResolvedValue(undefined);
    serviceMocks.invoicePaymentRecordEvent.mockResolvedValue({ id: 'event-1' });
  });

  it('imports unbilled expenses into a new invoice and marks them billed', async () => {
    render(
      <MemoryRouter initialEntries={['/invoices?new=1']}>
        <InvoicesList />
      </MemoryRouter>,
    );

    await screen.findByLabelText('Client *');
    await waitFor(() => {
      expect(serviceMocks.productGetAll).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText('Client *'), { target: { value: 'client-1' } });
    const nextButton = screen.getByRole('button', { name: /next: line items/i });
    await waitFor(() => {
      expect(nextButton).toBeEnabled();
    });
    fireEvent.click(nextButton);

    fireEvent.click(await screen.findByRole('button', { name: /import expenses/i }));
    expect(await screen.findByDisplayValue('Expense: Stock photo license')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next: details/i }));
    const modal = screen.getByRole('dialog', { name: /create invoice/i });
    fireEvent.click(within(modal).getByRole('button', { name: 'Create Invoice' }));

    await waitFor(() => {
      expect(serviceMocks.invoiceCreate).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'client-1' }),
        expect.arrayContaining([
          expect.objectContaining({
            description: 'Expense: Stock photo license',
            quantity: 1,
            unitPrice: 49.5,
          }),
        ]),
      );
      expect(serviceMocks.expenseMarkAsBilled).toHaveBeenCalledWith(['expense-1'], 'invoice-1');
    });
  });

  it('records a sent timeline event when invoice status changes to sent', async () => {
    serviceMocks.invoiceGetAll.mockResolvedValue([
      {
        id: 'invoice-1',
        clientId: 'client-1',
        invoiceNumber: 'INV-2026-0001',
        issueDate: '2026-06-02',
        dueDate: '2026-07-02',
        status: 'draft',
        notes: '',
        taxRate: 0.23,
        downPayment: 0,
        createdAt: '2026-06-02T00:00:00.000Z',
        updatedAt: '2026-06-02T00:00:00.000Z',
        clientName: 'Acme Studio',
        clientEmail: '',
        clientPhone: '',
        clientAddress: '',
        clientVatNumber: '',
        lineItems: [],
        subtotal: 0,
        taxAmount: 0,
        total: 0,
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/invoices']}>
        <InvoicesList />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText('Change status for invoice INV-2026-0001'), {
      target: { value: 'sent' },
    });

    await waitFor(() => {
      expect(serviceMocks.invoiceUpdate).toHaveBeenCalledWith('invoice-1', { status: 'sent' });
      expect(serviceMocks.invoicePaymentRecordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceId: 'invoice-1',
          eventType: 'sent',
          message: 'Invoice sent',
        }),
      );
    });
  });
});

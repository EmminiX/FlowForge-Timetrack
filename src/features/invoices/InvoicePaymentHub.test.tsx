import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InvoiceWithDetails } from '../../types';
import { InvoicePaymentHub } from './InvoicePaymentHub';

const serviceMocks = vi.hoisted(() => ({
  getSummary: vi.fn(),
  getEvents: vi.fn(),
  recordPayment: vi.fn(),
  sendReminder: vi.fn(),
}));

vi.mock('../../services', () => ({
  invoicePaymentService: {
    getSummary: serviceMocks.getSummary,
    getEvents: serviceMocks.getEvents,
    recordPayment: serviceMocks.recordPayment,
    sendReminder: serviceMocks.sendReminder,
  },
}));

const invoice: InvoiceWithDetails = {
  id: 'invoice-1',
  clientId: 'client-1',
  invoiceNumber: 'INV-2026-0001',
  issueDate: '2026-06-01',
  dueDate: '2026-06-15',
  status: 'sent',
  notes: '',
  taxRate: 0,
  downPayment: 0,
  createdAt: '2026-06-01T09:00:00.000Z',
  updatedAt: '2026-06-01T09:00:00.000Z',
  clientName: 'Acme Studio',
  clientEmail: '',
  clientPhone: '',
  clientAddress: '',
  clientVatNumber: '',
  lineItems: [],
  subtotal: 250,
  taxAmount: 0,
  total: 250,
};

describe('InvoicePaymentHub', () => {
  beforeEach(() => {
    serviceMocks.getSummary.mockResolvedValue({
      payments: [
        {
          id: 'payment-1',
          invoiceId: 'invoice-1',
          amount: 50,
          paymentDate: '2026-06-01',
          method: 'bank_transfer',
          reference: '',
          notes: '',
          createdAt: '2026-06-01T10:00:00.000Z',
        },
      ],
      totalPaid: 50,
      balanceDue: 200,
      isPaid: false,
    });
    serviceMocks.getEvents.mockResolvedValue([
      {
        id: 'event-1',
        invoiceId: 'invoice-1',
        eventType: 'sent',
        eventDate: '2026-06-01T09:00:00.000Z',
        message: 'Invoice sent',
        createdAt: '2026-06-01T09:00:00.000Z',
      },
    ]);
    serviceMocks.recordPayment.mockResolvedValue({ id: 'payment-2' });
    serviceMocks.sendReminder.mockResolvedValue({ id: 'event-2' });
  });

  it('shows payment history, balance, reminders, and records a partial payment', async () => {
    const onChanged = vi.fn();

    render(<InvoicePaymentHub invoice={invoice} currency='EUR' onChanged={onChanged} />);

    expect(await screen.findByText('Payment Hub')).toBeInTheDocument();
    expect(screen.getByText('€50.00 paid')).toBeInTheDocument();
    expect(screen.getByText('€200.00 due')).toBeInTheDocument();
    expect(screen.getByText('Invoice sent')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Payment amount'), { target: { value: '125' } });
    fireEvent.change(screen.getByLabelText('Payment reference'), { target: { value: 'BANK-456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));

    await waitFor(() => {
      expect(serviceMocks.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceId: 'invoice-1',
          amount: 125,
          method: 'bank_transfer',
          reference: 'BANK-456',
        }),
        250,
      );
      expect(onChanged).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send reminder' }));

    await waitFor(() => {
      expect(serviceMocks.sendReminder).toHaveBeenCalledWith('invoice-1');
    });
  });
});

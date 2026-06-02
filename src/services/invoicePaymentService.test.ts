import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateInvoicePaymentInput } from '../types';

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('../lib/db', () => ({
  getDb: vi.fn().mockResolvedValue(dbMocks),
}));

vi.mock('../lib/platform', () => ({
  shouldUseDemoMode: () => false,
}));

import { invoicePaymentService } from './invoicePaymentService';

describe('invoicePaymentService', () => {
  beforeEach(() => {
    dbMocks.select.mockReset();
    dbMocks.execute.mockReset();
  });

  it('records a partial payment and adds a payment timeline event', async () => {
    const randomUUID = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000301')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000302');
    dbMocks.select.mockResolvedValueOnce([{ totalPaid: 50 }]);
    dbMocks.execute.mockResolvedValue(undefined);

    const input: CreateInvoicePaymentInput = {
      invoiceId: 'invoice-1',
      amount: 75,
      paymentDate: '2026-06-02',
      method: 'bank_transfer',
      reference: 'BANK-123',
      notes: 'First tranche',
    };

    const payment = await invoicePaymentService.recordPayment(input, 250);

    expect(dbMocks.execute.mock.calls[0][0]).toContain('INSERT INTO invoice_payments');
    expect(dbMocks.execute.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['invoice-1', 75, '2026-06-02', 'bank_transfer', 'BANK-123']),
    );
    expect(dbMocks.execute.mock.calls[1][0]).toContain('INSERT INTO invoice_events');
    expect(dbMocks.execute.mock.calls[1][1]).toEqual(
      expect.arrayContaining(['invoice-1', 'partial_payment']),
    );
    expect(
      dbMocks.execute.mock.calls.some((call) => String(call[0]).includes("status = 'paid'")),
    ).toBe(false);
    expect(payment).toEqual(
      expect.objectContaining({
        id: '00000000-0000-4000-8000-000000000301',
        amount: 75,
        method: 'bank_transfer',
      }),
    );

    randomUUID.mockRestore();
  });

  it('marks the invoice paid when total recorded payments cover the invoice total', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000303')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000304');
    dbMocks.select.mockResolvedValueOnce([{ totalPaid: 175 }]);
    dbMocks.execute.mockResolvedValue(undefined);

    await invoicePaymentService.recordPayment(
      {
        invoiceId: 'invoice-1',
        amount: 75,
        paymentDate: '2026-06-02',
        method: 'card',
        reference: '',
        notes: '',
      },
      250,
    );

    expect(dbMocks.execute.mock.calls[1][1]).toEqual(expect.arrayContaining(['invoice-1', 'paid']));
    expect(dbMocks.execute.mock.calls[2][0]).toContain("status = 'paid'");
    expect(dbMocks.execute.mock.calls[2][1]).toEqual(expect.arrayContaining(['invoice-1']));
  });

  it('loads payment summary and reminder timeline events', async () => {
    dbMocks.select
      .mockResolvedValueOnce([
        {
          id: 'payment-1',
          invoiceId: 'invoice-1',
          amount: 120,
          paymentDate: '2026-06-01',
          method: 'bank_transfer',
          reference: '',
          notes: '',
          createdAt: '2026-06-01T10:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'event-1',
          invoiceId: 'invoice-1',
          eventType: 'reminder',
          eventDate: '2026-06-02T09:00:00.000Z',
          message: 'Reminder sent',
          createdAt: '2026-06-02T09:00:00.000Z',
        },
      ]);

    const summary = await invoicePaymentService.getSummary('invoice-1', 250);
    const events = await invoicePaymentService.getEvents('invoice-1');

    expect(summary).toEqual(
      expect.objectContaining({
        totalPaid: 120,
        balanceDue: 130,
        isPaid: false,
      }),
    );
    expect(events[0]).toEqual(expect.objectContaining({ eventType: 'reminder' }));
  });
});

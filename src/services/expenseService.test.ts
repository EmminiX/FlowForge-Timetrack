import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateExpenseInput } from '../types';

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

vi.mock('../lib/logger', () => ({
  expenseLogger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { expenseService } from './expenseService';

describe('expenseService', () => {
  beforeEach(() => {
    dbMocks.select.mockReset();
    dbMocks.execute.mockReset();
  });

  it('creates a billable expense with an optional receipt path', async () => {
    const randomUUID = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('00000000-0000-4000-8000-000000000101');
    dbMocks.execute.mockResolvedValue(undefined);

    const input: CreateExpenseInput = {
      clientId: 'client-1',
      projectId: 'project-1',
      description: 'Stock photo license',
      amount: 49.5,
      expenseDate: '2026-06-02',
      receiptPath: '/receipts/photo-license.pdf',
      isBillable: true,
      notes: 'Campaign asset',
    };

    const expense = await expenseService.create(input);

    expect(dbMocks.execute.mock.calls[0][0]).toContain('INSERT INTO expenses');
    expect(dbMocks.execute.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['/receipts/photo-license.pdf', 1, 0, null]),
    );
    expect(expense).toEqual(
      expect.objectContaining({
        id: '00000000-0000-4000-8000-000000000101',
        receiptPath: '/receipts/photo-license.pdf',
        isBillable: true,
        isBilled: false,
        invoiceId: null,
      }),
    );

    randomUUID.mockRestore();
  });

  it('loads unbilled billable expenses for a client with boolean fields normalized', async () => {
    dbMocks.select.mockResolvedValue([
      {
        id: 'expense-1',
        clientId: 'client-1',
        projectId: 'project-1',
        description: 'Domain renewal',
        amount: 18,
        expenseDate: '2026-06-01',
        receiptPath: null,
        isBillable: 1,
        isBilled: 0,
        invoiceId: null,
        notes: '',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
        clientName: 'Acme Studio',
        projectName: 'Brand Refresh',
      },
    ]);

    const expenses = await expenseService.getUnbilledByClientId('client-1');

    expect(dbMocks.select.mock.calls[0][0]).toContain('e.is_billable = 1');
    expect(dbMocks.select.mock.calls[0][0]).toContain('e.is_billed = 0');
    expect(expenses[0]).toEqual(
      expect.objectContaining({
        isBillable: true,
        isBilled: false,
        clientName: 'Acme Studio',
        projectName: 'Brand Refresh',
      }),
    );
  });

  it('marks imported expenses as billed against an invoice', async () => {
    dbMocks.execute.mockResolvedValue(undefined);

    await expenseService.markAsBilled(['expense-1', 'expense-2'], 'invoice-1');

    expect(dbMocks.execute.mock.calls[0][0]).toContain('invoice_id = $1');
    expect(dbMocks.execute.mock.calls[0][1]).toEqual(['invoice-1', 'expense-1', 'expense-2']);
  });
});

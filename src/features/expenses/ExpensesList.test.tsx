import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExpensesList } from './ExpensesList';

const serviceMocks = vi.hoisted(() => ({
  expenseGetAll: vi.fn(),
  expenseCreate: vi.fn(),
  expenseUpdate: vi.fn(),
  expenseDelete: vi.fn(),
  clientGetAll: vi.fn(),
  projectGetAll: vi.fn(),
}));

vi.mock('../../services', () => ({
  expenseService: {
    getAll: serviceMocks.expenseGetAll,
    create: serviceMocks.expenseCreate,
    update: serviceMocks.expenseUpdate,
    delete: serviceMocks.expenseDelete,
  },
  clientService: {
    getAll: serviceMocks.clientGetAll,
  },
  projectService: {
    getAll: serviceMocks.projectGetAll,
  },
}));

describe('ExpensesList', () => {
  beforeEach(() => {
    serviceMocks.expenseGetAll.mockResolvedValue([
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
        notes: 'Hero asset',
        createdAt: '2026-06-02T12:00:00.000Z',
        updatedAt: '2026-06-02T12:00:00.000Z',
        clientName: 'Acme Studio',
        projectName: 'Brand Refresh',
      },
    ]);
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
    serviceMocks.projectGetAll.mockResolvedValue([
      {
        id: 'project-1',
        clientId: 'client-1',
        name: 'Brand Refresh',
        description: '',
        status: 'active',
        color: '#2563eb',
        budgetType: 'none',
        budgetHours: 0,
        budgetAmount: 0,
        budgetAlertThreshold: 0.8,
        createdAt: '2026-06-02T09:00:00.000Z',
        updatedAt: '2026-06-02T09:00:00.000Z',
      },
    ]);
    serviceMocks.expenseCreate.mockResolvedValue({ id: 'expense-2' });
    serviceMocks.expenseUpdate.mockResolvedValue(null);
    serviceMocks.expenseDelete.mockResolvedValue(true);
  });

  it('renders expense receipts and creates a new billable expense with a demo receipt path', async () => {
    render(<ExpensesList />);

    expect(await screen.findByText('Stock photo license')).toBeInTheDocument();
    expect(screen.getByText('€49.50')).toBeInTheDocument();
    expect(screen.getByText('Receipt attached')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /new expense/i }));

    fireEvent.change(await screen.findByLabelText('Description *'), {
      target: { value: 'Typeface license' },
    });
    fireEvent.change(screen.getByLabelText('Amount *'), { target: { value: '89' } });
    fireEvent.change(screen.getByLabelText('Client'), { target: { value: 'client-1' } });
    fireEvent.change(screen.getByLabelText('Project'), { target: { value: 'project-1' } });
    fireEvent.click(screen.getByRole('button', { name: /attach receipt/i }));
    expect(await screen.findByText('attached-receipt.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /create expense/i }));

    await waitFor(() => {
      expect(serviceMocks.expenseCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Typeface license',
          amount: 89,
          clientId: 'client-1',
          projectId: 'project-1',
          receiptPath: '/demo/receipts/attached-receipt.pdf',
          isBillable: true,
        }),
      );
    });
  });
});

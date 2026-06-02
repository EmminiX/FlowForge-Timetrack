import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

const serviceMocks = vi.hoisted(() => ({
  clientGetAll: vi.fn(),
  projectGetAll: vi.fn(),
  invoiceGetAll: vi.fn(),
  invoiceUpdate: vi.fn(),
  exportInvoicePdfById: vi.fn(),
}));

vi.mock('../../services', () => ({
  clientService: { getAll: serviceMocks.clientGetAll },
  projectService: { getAll: serviceMocks.projectGetAll },
  invoiceService: {
    getAll: serviceMocks.invoiceGetAll,
    update: serviceMocks.invoiceUpdate,
  },
}));

vi.mock('../../services/invoicePdfService', () => ({
  exportInvoicePdfById: serviceMocks.exportInvoicePdfById,
}));

describe('Header command center', () => {
  beforeEach(() => {
    serviceMocks.clientGetAll.mockResolvedValue([]);
    serviceMocks.projectGetAll.mockResolvedValue([]);
    serviceMocks.invoiceGetAll.mockResolvedValue([]);
    serviceMocks.invoiceUpdate.mockResolvedValue(undefined);
    serviceMocks.exportInvoicePdfById.mockResolvedValue(undefined);
  });

  it('renders command actions inside the Cmd/Ctrl+K dialog', async () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /open command center/i }));
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.change(screen.getByRole('searchbox', { name: /command/i }), {
      target: { value: 'quick add' },
    });

    expect(await screen.findByRole('option', { name: /quick-add time/i })).toBeInTheDocument();
  });

  it('executes invoice mark-paid actions from the command center', async () => {
    serviceMocks.invoiceGetAll.mockResolvedValue([
      {
        id: 'invoice-1',
        invoiceNumber: 'INV-2026-0001',
        clientName: 'Acme Studio',
        status: 'sent',
      },
    ]);

    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /open command center/i }));
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.change(screen.getByRole('searchbox', { name: /command/i }), {
      target: { value: 'INV-2026-0001 paid' },
    });

    fireEvent.click(await screen.findByRole('option', { name: /mark paid/i }));

    await waitFor(() => {
      expect(serviceMocks.invoiceUpdate).toHaveBeenCalledWith('invoice-1', { status: 'paid' });
    });
  });
});

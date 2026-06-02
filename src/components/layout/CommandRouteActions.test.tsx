import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../types/settings';
import { ClientsList } from '../../features/clients/ClientsList';
import { InvoicesList } from '../../features/invoices/InvoicesList';
import { TimeEntriesList } from '../../features/time-entries/TimeEntriesList';

const serviceMocks = vi.hoisted(() => ({
  clientGetAll: vi.fn(),
  clientGetAllWithStats: vi.fn(),
  invoiceGetAll: vi.fn(),
  projectGetAll: vi.fn(),
  projectGetByClientId: vi.fn(),
  timeEntryGetAll: vi.fn(),
  timeEntryGetUnbilledByProject: vi.fn(),
  settingsLoad: vi.fn(),
  productGetAll: vi.fn(),
  downPaymentGetTotalByClientId: vi.fn(),
}));

vi.mock('../../services', () => ({
  clientService: {
    getAll: serviceMocks.clientGetAll,
    getAllWithStats: serviceMocks.clientGetAllWithStats,
  },
  invoiceService: {
    getAll: serviceMocks.invoiceGetAll,
  },
  projectService: {
    getAll: serviceMocks.projectGetAll,
    getByClientId: serviceMocks.projectGetByClientId,
  },
  timeEntryService: {
    getAll: serviceMocks.timeEntryGetAll,
    getUnbilledByProject: serviceMocks.timeEntryGetUnbilledByProject,
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
}));

describe('command route actions', () => {
  beforeEach(() => {
    serviceMocks.clientGetAll.mockResolvedValue([]);
    serviceMocks.clientGetAllWithStats.mockResolvedValue([]);
    serviceMocks.invoiceGetAll.mockResolvedValue([]);
    serviceMocks.projectGetAll.mockResolvedValue([
      {
        id: 'project-1',
        clientId: 'client-1',
        name: 'Brand Refresh',
        description: '',
        color: '#14b8a6',
        status: 'active',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    ]);
    serviceMocks.projectGetByClientId.mockResolvedValue([]);
    serviceMocks.timeEntryGetAll.mockResolvedValue([]);
    serviceMocks.timeEntryGetUnbilledByProject.mockResolvedValue([]);
    serviceMocks.settingsLoad.mockResolvedValue(DEFAULT_SETTINGS);
    serviceMocks.productGetAll.mockResolvedValue([]);
    serviceMocks.downPaymentGetTotalByClientId.mockResolvedValue(0);
  });

  it('opens the client form from /clients?new=1', async () => {
    render(
      <MemoryRouter initialEntries={['/clients?new=1']}>
        <ClientsList />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('dialog', { name: /new client/i })).toBeInTheDocument();
  });

  it('opens the invoice builder from /invoices?new=1', async () => {
    render(
      <MemoryRouter initialEntries={['/invoices?new=1']}>
        <InvoicesList />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('dialog', { name: /create invoice/i })).toBeInTheDocument();
  });

  it('opens quick-add time from /time-entries?quick-add=1', async () => {
    render(
      <MemoryRouter initialEntries={['/time-entries?quick-add=1']}>
        <TimeEntriesList />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('dialog', { name: /quick-add time/i })).toBeInTheDocument();
  });
});

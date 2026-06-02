import { describe, expect, it } from 'vitest';
import { buildCommandCenterItems } from './useGlobalSearch';
import type { Client, InvoiceWithDetails, Project } from '../types';

const clients: Client[] = [
  {
    id: 'client-acme',
    name: 'Acme Studio',
    email: 'hello@acme.example',
    address: '',
    phone: '',
    vatNumber: '',
    hourlyRate: 95,
    currency: 'EUR',
    notes: '',
    createdAt: '2026-06-02T09:00:00.000Z',
    updatedAt: '2026-06-02T09:00:00.000Z',
  },
];

const projects: Project[] = [
  {
    id: 'project-brand',
    clientId: 'client-acme',
    name: 'Brand Refresh',
    description: 'Landing page and invoice polish',
    status: 'active',
    color: '#2563eb',
    budgetType: 'none',
    budgetHours: 0,
    budgetAmount: 0,
    budgetAlertThreshold: 0.8,
    createdAt: '2026-06-02T09:00:00.000Z',
    updatedAt: '2026-06-02T09:00:00.000Z',
  },
];

const invoices: Pick<InvoiceWithDetails, 'id' | 'invoiceNumber' | 'clientName' | 'status'>[] = [
  {
    id: 'invoice-1',
    invoiceNumber: 'INV-2026-0001',
    clientName: 'Acme Studio',
    status: 'sent',
  },
];

describe('buildCommandCenterItems', () => {
  it('mixes regular search results with command actions', () => {
    const results = buildCommandCenterItems({
      query: 'acme',
      clients,
      projects,
      invoices,
    });

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'search', type: 'client', title: 'Acme Studio' }),
        expect.objectContaining({ kind: 'search', type: 'invoice', title: 'INV-2026-0001' }),
      ]),
    );
  });

  it('returns workflow actions for add client, create invoice, and quick-add time', () => {
    const results = buildCommandCenterItems({
      query: 'quick add',
      clients,
      projects,
      invoices,
    });

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'action', action: 'add-client' }),
        expect.objectContaining({ kind: 'action', action: 'create-invoice' }),
        expect.objectContaining({ kind: 'action', action: 'quick-add-time' }),
      ]),
    );
  });

  it('adds project-aware start timer actions', () => {
    const results = buildCommandCenterItems({
      query: 'start brand',
      clients,
      projects,
      invoices,
    });

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'action',
          action: 'start-timer',
          projectId: 'project-brand',
          title: 'Start Timer: Brand Refresh',
        }),
      ]),
    );
  });

  it('adds invoice actions for mark paid and export PDF', () => {
    const results = buildCommandCenterItems({
      query: 'INV-2026-0001 pdf paid',
      clients,
      projects,
      invoices,
    });

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'action',
          action: 'mark-paid',
          invoiceId: 'invoice-1',
        }),
        expect.objectContaining({
          kind: 'action',
          action: 'export-pdf',
          invoiceId: 'invoice-1',
        }),
      ]),
    );
  });
});

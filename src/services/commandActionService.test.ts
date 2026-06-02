import { describe, expect, it, vi } from 'vitest';
import type { ActionResult, SearchResult } from '../hooks/useGlobalSearch';
import { executeCommandCenterItem } from './commandActionService';

describe('executeCommandCenterItem', () => {
  it('navigates normal search results', async () => {
    const navigate = vi.fn();
    const result: SearchResult = {
      id: 'search-client-1',
      kind: 'search',
      type: 'client',
      title: 'Acme',
      route: '/clients',
    };

    await executeCommandCenterItem(result, { navigate });

    expect(navigate).toHaveBeenCalledWith('/clients');
  });

  it('starts a project timer from a start-timer action', async () => {
    const navigate = vi.fn();
    const startTimer = vi.fn().mockResolvedValue(undefined);
    const action: ActionResult = {
      id: 'action-start-timer-project-1',
      kind: 'action',
      action: 'start-timer',
      title: 'Start Timer: Brand Refresh',
      route: '/',
      projectId: 'project-1',
      projectName: 'Brand Refresh',
      projectColor: '#14b8a6',
    };

    await executeCommandCenterItem(action, { navigate, startTimer });

    expect(startTimer).toHaveBeenCalledWith('project-1', 'Brand Refresh', '#14b8a6');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('marks an invoice paid from a mark-paid action', async () => {
    const navigate = vi.fn();
    const markInvoicePaid = vi.fn().mockResolvedValue(undefined);
    const action: ActionResult = {
      id: 'action-mark-paid-invoice-1',
      kind: 'action',
      action: 'mark-paid',
      title: 'Mark Paid: INV-2026-0001',
      route: '/invoices',
      invoiceId: 'invoice-1',
    };

    await executeCommandCenterItem(action, { navigate, markInvoicePaid });

    expect(markInvoicePaid).toHaveBeenCalledWith('invoice-1');
    expect(navigate).toHaveBeenCalledWith('/invoices');
  });

  it('exports an invoice PDF from an export-pdf action', async () => {
    const navigate = vi.fn();
    const exportInvoicePdf = vi.fn().mockResolvedValue(undefined);
    const action: ActionResult = {
      id: 'action-export-pdf-invoice-1',
      kind: 'action',
      action: 'export-pdf',
      title: 'Export PDF: INV-2026-0001',
      route: '/invoices',
      invoiceId: 'invoice-1',
    };

    await executeCommandCenterItem(action, { navigate, exportInvoicePdf });

    expect(exportInvoicePdf).toHaveBeenCalledWith('invoice-1');
    expect(navigate).toHaveBeenCalledWith('/invoices');
  });

  it('navigates route-only workflow actions', async () => {
    const navigate = vi.fn();
    const action: ActionResult = {
      id: 'action-quick-add-time',
      kind: 'action',
      action: 'quick-add-time',
      title: 'Quick-Add Time',
      route: '/time-entries?quick-add=1',
    };

    await executeCommandCenterItem(action, { navigate });

    expect(navigate).toHaveBeenCalledWith('/time-entries?quick-add=1');
  });
});

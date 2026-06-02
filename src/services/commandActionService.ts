import type { CommandCenterItem } from '../hooks/useGlobalSearch';
import { invoiceService } from './invoiceService';
import { exportInvoicePdfById } from './invoicePdfService';

interface CommandActionDependencies {
  navigate: (route: string) => void;
  startTimer?: (projectId: string, projectName: string, projectColor: string) => Promise<void> | void;
  markInvoicePaid?: (invoiceId: string) => Promise<void> | void;
  exportInvoicePdf?: (invoiceId: string) => Promise<void> | void;
}

async function markInvoicePaid(invoiceId: string): Promise<void> {
  await invoiceService.update(invoiceId, { status: 'paid' });
}

export async function executeCommandCenterItem(
  item: CommandCenterItem,
  dependencies: CommandActionDependencies,
): Promise<void> {
  if (item.kind === 'search') {
    dependencies.navigate(item.route);
    return;
  }

  if (item.action === 'start-timer') {
    if (!dependencies.startTimer) {
      throw new Error('Start timer action is unavailable');
    }
    if (!item.projectId || !item.projectName) {
      throw new Error('Start timer action is missing project details');
    }

    await dependencies.startTimer(item.projectId, item.projectName, item.projectColor || '#14b8a6');
  }

  if (item.action === 'mark-paid') {
    if (!item.invoiceId) {
      throw new Error('Mark paid action is missing an invoice');
    }

    await (dependencies.markInvoicePaid || markInvoicePaid)(item.invoiceId);
  }

  if (item.action === 'export-pdf') {
    if (!item.invoiceId) {
      throw new Error('Export PDF action is missing an invoice');
    }

    await (dependencies.exportInvoicePdf || exportInvoicePdfById)(item.invoiceId);
  }

  if (item.route) {
    dependencies.navigate(item.route);
  }
}

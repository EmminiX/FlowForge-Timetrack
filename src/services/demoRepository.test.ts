import { describe, expect, it } from 'vitest';
import { createDemoRepository } from './demoRepository';

describe('demo repository', () => {
  it('loads connected sample data for the main app surfaces', async () => {
    const repo = createDemoRepository();

    const [clients, projects, timeEntries, expenses, invoices, products, settings, dashboard] =
      await Promise.all([
        repo.clients.getAll(),
        repo.projects.getAll(),
        repo.timeEntries.getAll(),
        repo.expenses.getAll(),
        repo.invoices.getAll(),
        repo.products.getAll(),
        repo.settings.load(),
        repo.dashboard.getDashboardData(),
      ]);

    expect(clients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'demo-client-acme', name: 'Acme Studio' }),
      ]),
    );
    expect(projects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'demo-project-brand', clientId: 'demo-client-acme' }),
      ]),
    );
    expect(timeEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ projectId: 'demo-project-brand', projectName: 'Brand Refresh' }),
      ]),
    );
    expect(invoices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ clientId: 'demo-client-acme', invoiceNumber: 'INV-2026-0001' }),
      ]),
    );
    expect(expenses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'demo-expense-stock-photo',
          clientName: 'Acme Studio',
          receiptPath: '/demo/receipts/stock-photo.pdf',
        }),
      ]),
    );
    expect(products.length).toBeGreaterThan(0);
    expect(settings.businessName).toBe('TimeSage Demo Studio');
    expect(dashboard.today.totalSeconds).toBeGreaterThan(0);
    expect(dashboard.clientBreakdown[0]).toEqual(
      expect.objectContaining({ clientId: 'demo-client-acme' }),
    );
    expect(dashboard.projectBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          projectId: 'demo-project-brand',
          budgetStatus: 'near',
        }),
      ]),
    );
  });

  it('filters time entries by project, client, and billed state', async () => {
    const repo = createDemoRepository();

    await expect(repo.timeEntries.getAll({ projectId: 'demo-project-brand' })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ projectId: 'demo-project-brand' })]),
    );
    await expect(repo.timeEntries.getAll({ clientId: 'demo-client-nova' })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ clientId: 'demo-client-nova' })]),
    );

    const unbilled = await repo.timeEntries.getAll({ isBilled: false });
    expect(unbilled.every((entry) => entry.isBilled === false)).toBe(true);

    await repo.timeEntries.markAsBilled([unbilled[0].id]);

    const updated = await repo.timeEntries.getById(unbilled[0].id);
    expect(updated?.isBilled).toBe(true);
  });

  it('keeps demo writes isolated to the current repository instance', async () => {
    const repo = createDemoRepository();

    const created = await repo.clients.create({
      name: 'Temporary Demo Client',
      email: 'temp@example.com',
      address: '',
      phone: '',
      vatNumber: '',
      hourlyRate: 120,
      currency: 'EUR',
      notes: '',
    });

    await expect(repo.clients.getById(created.id)).resolves.toEqual(
      expect.objectContaining({ name: 'Temporary Demo Client' }),
    );

    const freshRepo = createDemoRepository();
    await expect(freshRepo.clients.getById(created.id)).resolves.toBeNull();
  });

  it('tracks billable demo expenses and marks imported expenses as billed', async () => {
    const repo = createDemoRepository();

    const created = await repo.expenses.create({
      clientId: 'demo-client-acme',
      projectId: 'demo-project-brand',
      description: 'Typeface license',
      amount: 89,
      expenseDate: '2026-06-02',
      receiptPath: '/demo/receipts/typeface-license.pdf',
      isBillable: true,
      notes: 'Launch creative',
    });

    const unbilled = await repo.expenses.getUnbilledByClientId('demo-client-acme');
    expect(unbilled).toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id })]));

    await repo.expenses.markAsBilled([created.id], 'demo-invoice-2');
    await expect(repo.expenses.getById(created.id)).resolves.toEqual(
      expect.objectContaining({ isBilled: true, invoiceId: 'demo-invoice-2' }),
    );
  });

  it('aggregates dashboard currency buckets without duplicate keys', async () => {
    const repo = createDemoRepository();

    const dashboard = await repo.dashboard.getDashboardData();
    const unbilledCurrencies = dashboard.unbilled.amountsByCurrency.map((item) => item.currency);
    const billedCurrencies = dashboard.billed.amountsByCurrency.map((item) => item.currency);

    expect(new Set(unbilledCurrencies).size).toBe(unbilledCurrencies.length);
    expect(new Set(billedCurrencies).size).toBe(billedCurrencies.length);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadServices() {
  vi.resetModules();
  return Promise.all([
    import('./clientService'),
    import('./projectService'),
    import('./timeEntryService'),
    import('./invoiceService'),
    import('./productService'),
    import('./settingsService'),
    import('./dashboardService'),
  ]);
}

describe('demo mode services', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('loads main app data through existing services without SQLite', async () => {
    vi.stubGlobal('__TAURI__', undefined);
    vi.stubGlobal('__TAURI_INTERNALS__', undefined);

    const [
      { clientService },
      { projectService },
      { timeEntryService },
      { invoiceService },
      { productService },
      { settingsService },
      { dashboardService },
    ] = await loadServices();

    await expect(clientService.getAll()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Acme Studio' })]),
    );
    await expect(projectService.getActive()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Brand Refresh' })]),
    );
    await expect(timeEntryService.getAll({ clientId: 'demo-client-nova' })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ clientName: 'Nova Labs' })]),
    );
    await expect(invoiceService.getAll()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ invoiceNumber: 'INV-2026-0001' })]),
    );
    await expect(productService.getAll()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Technical Audit' })]),
    );
    await expect(settingsService.load()).resolves.toEqual(
      expect.objectContaining({ businessName: 'TimeSage Demo Studio' }),
    );
    await expect(dashboardService.getDashboardData()).resolves.toEqual(
      expect.objectContaining({
        today: expect.objectContaining({ totalSeconds: expect.any(Number) }),
      }),
    );
  });

  it('persists demo writes through service calls for the current browser session', async () => {
    vi.stubGlobal('__TAURI__', undefined);
    vi.stubGlobal('__TAURI_INTERNALS__', undefined);

    const [{ clientService }, , , { invoiceService }] = await loadServices();

    const client = await clientService.create({
      name: 'Service Demo Client',
      email: 'service@example.com',
      address: '',
      phone: '',
      vatNumber: '',
      hourlyRate: 110,
      currency: 'EUR',
      notes: '',
    });

    await expect(clientService.getById(client.id)).resolves.toEqual(
      expect.objectContaining({ name: 'Service Demo Client' }),
    );

    await invoiceService.update('demo-invoice-1', { status: 'paid' });

    await expect(invoiceService.getById('demo-invoice-1')).resolves.toEqual(
      expect.objectContaining({ status: 'paid' }),
    );
  });
});

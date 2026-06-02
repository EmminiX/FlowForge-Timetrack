import { describe, expect, it } from 'vitest';
import {
  clientService,
  dashboardService,
  invoiceService,
  productService,
  projectService,
  settingsService,
  timeEntryService,
} from './index';

describe('browser demo services', () => {
  it('loads core app data without Tauri globals', async () => {
    const runtimeWindow = window as unknown as Window & Record<string, unknown>;
    delete runtimeWindow.__TAURI__;
    delete runtimeWindow.__TAURI_INTERNALS__;

    const settings = await settingsService.load();
    const clients = await clientService.getAll();
    const projects = await projectService.getActive();
    const entries = await timeEntryService.getAll();
    const invoices = await invoiceService.getAll();
    const products = await productService.getAll();
    const dashboard = await dashboardService.getDashboardData();

    expect(settings.theme).toBeDefined();
    expect(clients.length).toBeGreaterThan(0);
    expect(projects.length).toBeGreaterThan(0);
    expect(entries.length).toBeGreaterThan(0);
    expect(invoices.length).toBeGreaterThan(0);
    expect(products.length).toBeGreaterThan(0);
    expect(dashboard.week.totalSeconds).toBeGreaterThan(0);
  });
});

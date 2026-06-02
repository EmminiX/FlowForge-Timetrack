import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateProjectInput } from '../types';

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
  projectLogger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { projectService } from './projectService';

describe('projectService budget mapping', () => {
  beforeEach(() => {
    dbMocks.select.mockReset();
    dbMocks.execute.mockReset();
  });

  it('adds budget scope status to project stats from SQLite rows', async () => {
    dbMocks.select.mockResolvedValue([
      {
        id: 'project-1',
        clientId: 'client-1',
        name: 'Brand Refresh',
        description: '',
        status: 'active',
        color: '#007AFF',
        budgetType: 'hourly',
        budgetHours: 10,
        budgetAmount: 0,
        budgetAlertThreshold: 0.8,
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
        clientName: 'Acme Studio',
        totalHours: 8.5,
        totalBillable: 850,
      },
    ]);

    const projects = await projectService.getAllWithStats();

    expect(dbMocks.select.mock.calls[0][0]).toContain('p.budget_type as budgetType');
    expect(projects[0]).toEqual(
      expect.objectContaining({
        budgetStatus: 'near',
        budgetUsedPercent: 85,
        budgetRemainingHours: 1.5,
        budgetRemainingAmount: null,
      }),
    );
  });

  it('persists budget fields when creating a project', async () => {
    const randomUUID = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('00000000-0000-4000-8000-000000000001');
    dbMocks.execute.mockResolvedValue(undefined);

    const input: CreateProjectInput = {
      clientId: 'client-1',
      name: 'Budgeted Build',
      description: '',
      status: 'active',
      color: '#34C759',
      budgetType: 'fixed',
      budgetHours: 0,
      budgetAmount: 5000,
      budgetAlertThreshold: 0.75,
    };

    const project = await projectService.create(input);

    expect(dbMocks.execute.mock.calls[0][0]).toContain('budget_type');
    expect(dbMocks.execute.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['fixed', 0, 5000, 0.75]),
    );
    expect(project).toEqual(
      expect.objectContaining({
        budgetType: 'fixed',
        budgetHours: 0,
        budgetAmount: 5000,
        budgetAlertThreshold: 0.75,
      }),
    );

    randomUUID.mockRestore();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
}));

vi.mock('../lib/db', () => ({
  getDb: vi.fn().mockResolvedValue(dbMocks),
}));

vi.mock('../lib/platform', () => ({
  shouldUseDemoMode: () => false,
}));

import { dashboardService } from './dashboardService';

describe('dashboard project budget data', () => {
  beforeEach(() => {
    dbMocks.select.mockReset();
  });

  it('adds project budget status to the project breakdown', async () => {
    dbMocks.select.mockResolvedValue([
      {
        project_id: 'project-1',
        project_name: 'Brand Refresh',
        color: '#007AFF',
        total_seconds: 30600,
        total_billable: 850,
        budget_type: 'hourly',
        budget_hours: 10,
        budget_amount: 0,
        budget_alert_threshold: 0.8,
      },
    ]);

    const projects = await dashboardService.getProjectBreakdown();

    expect(dbMocks.select.mock.calls[0][0]).toContain('p.budget_type as budget_type');
    expect(projects[0]).toEqual(
      expect.objectContaining({
        budgetType: 'hourly',
        budgetStatus: 'near',
        budgetUsedPercent: 85,
        budgetRemainingHours: 1.5,
      }),
    );
  });
});

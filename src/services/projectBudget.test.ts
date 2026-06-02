import { describe, expect, it } from 'vitest';
import type { ProjectWithStats } from '../types';
import { calculateProjectBudgetStatus } from '../types';

function project(overrides: Partial<ProjectWithStats>): ProjectWithStats {
  return {
    id: 'project-1',
    clientId: 'client-1',
    clientName: 'Acme Studio',
    name: 'Brand Refresh',
    description: '',
    status: 'active',
    color: '#14b8a6',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    totalHours: 0,
    totalBillable: 0,
    budgetType: 'none',
    budgetHours: 0,
    budgetAmount: 0,
    budgetAlertThreshold: 0.8,
    budgetStatus: 'none',
    budgetUsedPercent: 0,
    budgetRemainingHours: null,
    budgetRemainingAmount: null,
    ...overrides,
  };
}

describe('project budget status', () => {
  it('reports hourly budgets as ok, near, or over based on tracked hours', () => {
    expect(
      calculateProjectBudgetStatus(project({ budgetType: 'hourly', budgetHours: 10, totalHours: 6 })),
    ).toEqual(
      expect.objectContaining({
        budgetStatus: 'ok',
        budgetUsedPercent: 60,
        budgetRemainingHours: 4,
      }),
    );

    expect(
      calculateProjectBudgetStatus(project({ budgetType: 'hourly', budgetHours: 10, totalHours: 8 })),
    ).toEqual(expect.objectContaining({ budgetStatus: 'near', budgetUsedPercent: 80 }));

    expect(
      calculateProjectBudgetStatus(project({ budgetType: 'hourly', budgetHours: 10, totalHours: 11 })),
    ).toEqual(
      expect.objectContaining({
        budgetStatus: 'over',
        budgetUsedPercent: 110,
        budgetRemainingHours: -1,
      }),
    );
  });

  it('reports fixed-fee and retainer budgets based on billable value', () => {
    expect(
      calculateProjectBudgetStatus(
        project({ budgetType: 'fixed', budgetAmount: 1000, totalBillable: 850 }),
      ),
    ).toEqual(
      expect.objectContaining({
        budgetStatus: 'near',
        budgetUsedPercent: 85,
        budgetRemainingAmount: 150,
      }),
    );

    expect(
      calculateProjectBudgetStatus(
        project({ budgetType: 'retainer', budgetAmount: 1000, totalBillable: 1200 }),
      ),
    ).toEqual(
      expect.objectContaining({
        budgetStatus: 'over',
        budgetUsedPercent: 120,
        budgetRemainingAmount: -200,
      }),
    );
  });

  it('keeps budget status empty when no budget is configured', () => {
    expect(calculateProjectBudgetStatus(project({ totalHours: 100, totalBillable: 10000 }))).toEqual(
      expect.objectContaining({
        budgetStatus: 'none',
        budgetUsedPercent: 0,
        budgetRemainingHours: null,
        budgetRemainingAmount: null,
      }),
    );
  });
});

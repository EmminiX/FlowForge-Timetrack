// Project data model

export type ProjectStatus = 'active' | 'paused' | 'completed';
export type ProjectBudgetType = 'none' | 'hourly' | 'fixed' | 'retainer';
export type ProjectBudgetStatus = 'none' | 'ok' | 'near' | 'over';

export interface Project {
  id: string;
  clientId: string | null;
  name: string;
  description: string;
  status: ProjectStatus;
  color: string; // hex color
  budgetType: ProjectBudgetType;
  budgetHours: number;
  budgetAmount: number;
  budgetAlertThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithStats extends Project {
  clientName: string | null;
  totalHours: number;
  totalBillable: number;
  budgetStatus: ProjectBudgetStatus;
  budgetUsedPercent: number;
  budgetRemainingHours: number | null;
  budgetRemainingAmount: number | null;
}

export type CreateProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProjectInput = Partial<CreateProjectInput>;

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];

export const PROJECT_BUDGET_TYPE_OPTIONS: { value: ProjectBudgetType; label: string }[] = [
  { value: 'none', label: 'No budget' },
  { value: 'hourly', label: 'Hourly budget' },
  { value: 'fixed', label: 'Fixed fee' },
  { value: 'retainer', label: 'Retainer' },
];

export function calculateProjectBudgetStatus(
  project: Pick<
    ProjectWithStats,
    | 'budgetType'
    | 'budgetHours'
    | 'budgetAmount'
    | 'budgetAlertThreshold'
    | 'totalHours'
    | 'totalBillable'
  >,
): Pick<
  ProjectWithStats,
  'budgetStatus' | 'budgetUsedPercent' | 'budgetRemainingHours' | 'budgetRemainingAmount'
> {
  if (project.budgetType === 'none') {
    return {
      budgetStatus: 'none',
      budgetUsedPercent: 0,
      budgetRemainingHours: null,
      budgetRemainingAmount: null,
    };
  }

  const threshold = project.budgetAlertThreshold || 0.8;
  const limit = project.budgetType === 'hourly' ? project.budgetHours : project.budgetAmount;
  const used = project.budgetType === 'hourly' ? project.totalHours : project.totalBillable;

  if (limit <= 0) {
    return {
      budgetStatus: 'none',
      budgetUsedPercent: 0,
      budgetRemainingHours: null,
      budgetRemainingAmount: null,
    };
  }

  const usedPercent = (used / limit) * 100;
  const budgetStatus: ProjectBudgetStatus =
    used > limit ? 'over' : usedPercent >= threshold * 100 ? 'near' : 'ok';

  return {
    budgetStatus,
    budgetUsedPercent: Math.round(usedPercent * 100) / 100,
    budgetRemainingHours: project.budgetType === 'hourly' ? limit - used : null,
    budgetRemainingAmount: project.budgetType === 'hourly' ? null : limit - used,
  };
}

export const DEFAULT_PROJECT_COLORS = [
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#AF52DE', // Purple
  '#8E8E93', // Gray
  '#5856D6', // Indigo
  '#00C7BE', // Teal
];

// Project data model

export type ProjectStatus = 'active' | 'paused' | 'completed';

export interface Project {
  id: string;
  clientId: string | null;
  name: string;
  description: string;
  status: ProjectStatus;
  color: string; // hex color
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithStats extends Project {
  clientName: string | null;
  totalHours: number;
  totalBillable: number;
}

export type CreateProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProjectInput = Partial<CreateProjectInput>;

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];

export const DEFAULT_PROJECT_COLORS = [
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#FF3B30', // Red
  '#AF52DE', // Purple
  '#FF2D55', // Pink
  '#5856D6', // Indigo
  '#00C7BE', // Teal
];

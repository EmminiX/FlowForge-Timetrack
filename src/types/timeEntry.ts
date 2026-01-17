// TimeEntry data model

export interface TimeEntry {
  id: string;
  projectId: string;
  startTime: string; // ISO datetime
  endTime: string | null; // null if currently running
  pauseDuration: number; // seconds
  notes: string;
  isBillable: boolean;
  isBilled: boolean;
  createdAt: string;
}

export interface TimeEntryWithProject extends TimeEntry {
  projectName: string;
  projectColor: string;
  clientId: string | null;
  clientName: string | null;
}

export type CreateTimeEntryInput = Omit<TimeEntry, 'id' | 'createdAt'>;
export type UpdateTimeEntryInput = Partial<Omit<CreateTimeEntryInput, 'projectId'>>;

// Computed helpers
export function calculateDuration(entry: TimeEntry): number {
  const endTime = entry.endTime ? new Date(entry.endTime).getTime() : Date.now();
  const startTime = new Date(entry.startTime).getTime();
  const elapsed = (endTime - startTime) / 1000; // in seconds
  return Math.max(0, elapsed - entry.pauseDuration);
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDurationShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return '<1m';
}

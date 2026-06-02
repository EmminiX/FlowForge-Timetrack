export type ActivityTimelineEventType = 'activity' | 'idle';
export type ActivityTimelineSource = 'system' | 'manual' | 'demo';

export interface ActivityTimelineEvent {
  id: string;
  eventType: ActivityTimelineEventType;
  appName: string;
  windowTitle: string | null;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  source: ActivityTimelineSource;
  projectId: string | null;
  timeEntryId: string | null;
  notes: string;
  isDismissed: boolean;
  createdAt: string;
}

export interface ActivityTimelineEventWithProject extends ActivityTimelineEvent {
  projectName?: string | null;
  projectColor?: string | null;
}

export interface CreateActivityTimelineEventInput {
  eventType: ActivityTimelineEventType;
  appName: string;
  windowTitle?: string | null;
  startedAt: string;
  endedAt: string;
  source?: ActivityTimelineSource;
  projectId?: string | null;
  notes?: string;
}

export interface ActivityTimelineFilters {
  startDate?: string;
  endDate?: string;
  includeDismissed?: boolean;
}

export interface TimelineSuggestion {
  id: string;
  title: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  eventIds: string[];
  notes: string;
}

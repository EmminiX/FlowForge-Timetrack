import { getDb } from '../lib/db';
import { activityTimelineLogger } from '../lib/logger';
import { shouldUseDemoMode } from '../lib/platform';
import type {
  ActivityTimelineEvent,
  ActivityTimelineEventWithProject,
  ActivityTimelineFilters,
  CreateActivityTimelineEventInput,
  TimelineSuggestion,
} from '../types';
import { buildTimelineSuggestions } from '../features/activity-timeline/timelineUtils';
import { demoRepository } from './demoRepository';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function durationSeconds(startedAt: string, endedAt: string): number {
  return Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
}

function normalizeEvent<T extends ActivityTimelineEventWithProject | ActivityTimelineEvent>(event: T): T {
  return {
    ...event,
    isDismissed: Boolean(event.isDismissed),
  };
}

export const activityTimelineService = {
  async getRecent(filters?: ActivityTimelineFilters): Promise<ActivityTimelineEventWithProject[]> {
    if (shouldUseDemoMode()) {
      return demoRepository.activityTimeline.getRecent(filters);
    }

    const db = await getDb();
    let query = `
      SELECT
        atl.id,
        atl.event_type as eventType,
        atl.app_name as appName,
        atl.window_title as windowTitle,
        atl.started_at as startedAt,
        atl.ended_at as endedAt,
        atl.duration_seconds as durationSeconds,
        atl.source,
        atl.project_id as projectId,
        atl.time_entry_id as timeEntryId,
        atl.notes,
        atl.is_dismissed as isDismissed,
        atl.created_at as createdAt,
        p.name as projectName,
        p.color as projectColor
      FROM activity_timeline_events atl
      LEFT JOIN projects p ON p.id = atl.project_id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (filters?.startDate) {
      query += ` AND atl.started_at >= $${paramIndex++}`;
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      query += ` AND atl.started_at <= $${paramIndex++}`;
      params.push(filters.endDate);
    }

    if (!filters?.includeDismissed) {
      query += ` AND atl.is_dismissed = 0`;
    }

    query += ` ORDER BY atl.started_at DESC LIMIT 200`;

    const rows = await db.select<ActivityTimelineEventWithProject[]>(query, params);
    return rows.map(normalizeEvent);
  },

  async getSuggestions(options?: { minDurationSeconds?: number }): Promise<TimelineSuggestion[]> {
    if (shouldUseDemoMode()) {
      return demoRepository.activityTimeline.getSuggestions(options);
    }

    const events = await this.getRecent({ includeDismissed: false });
    return buildTimelineSuggestions(events, options);
  },

  async recordEvent(input: CreateActivityTimelineEventInput): Promise<ActivityTimelineEvent> {
    if (shouldUseDemoMode()) {
      return demoRepository.activityTimeline.recordEvent(input);
    }

    const db = await getDb();
    const id = generateId();
    const createdAt = now();
    const duration = durationSeconds(input.startedAt, input.endedAt);
    const event: ActivityTimelineEvent = {
      id,
      eventType: input.eventType,
      appName: input.appName,
      windowTitle: input.windowTitle || null,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationSeconds: duration,
      source: input.source || 'system',
      projectId: input.projectId || null,
      timeEntryId: null,
      notes: input.notes || '',
      isDismissed: false,
      createdAt,
    };

    try {
      await db.execute(
        `
          INSERT INTO activity_timeline_events (
            id, event_type, app_name, window_title, started_at, ended_at, duration_seconds,
            source, project_id, time_entry_id, notes, is_dismissed, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `,
        [
          event.id,
          event.eventType,
          event.appName,
          event.windowTitle,
          event.startedAt,
          event.endedAt,
          event.durationSeconds,
          event.source,
          event.projectId,
          event.timeEntryId,
          event.notes,
          0,
          event.createdAt,
        ],
      );
      return event;
    } catch (error) {
      activityTimelineLogger.error('Failed to record timeline event', error);
      throw error;
    }
  },

  async recordIdleGap(input: { startedAt: string; endedAt: string }): Promise<ActivityTimelineEvent> {
    return this.recordEvent({
      eventType: 'idle',
      appName: 'Idle',
      windowTitle: null,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      source: 'system',
      notes: 'Idle gap detected locally',
    });
  },

  async linkTimeEntry(eventIds: string[], timeEntryId: string): Promise<void> {
    if (eventIds.length === 0) return;
    if (shouldUseDemoMode()) {
      return demoRepository.activityTimeline.linkTimeEntry(eventIds, timeEntryId);
    }

    const db = await getDb();
    const placeholders = eventIds.map((_, index) => `$${index + 2}`).join(', ');
    await db.execute(
      `
        UPDATE activity_timeline_events
        SET time_entry_id = $1
        WHERE id IN (${placeholders})
      `,
      [timeEntryId, ...eventIds],
    );
  },

  async dismiss(eventIds: string[]): Promise<void> {
    if (eventIds.length === 0) return;
    if (shouldUseDemoMode()) {
      return demoRepository.activityTimeline.dismiss(eventIds);
    }

    const db = await getDb();
    const placeholders = eventIds.map((_, index) => `$${index + 1}`).join(', ');
    await db.execute(
      `
        UPDATE activity_timeline_events
        SET is_dismissed = 1
        WHERE id IN (${placeholders})
      `,
      eventIds,
    );
  },
};

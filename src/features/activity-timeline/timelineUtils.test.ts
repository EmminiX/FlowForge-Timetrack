import { describe, expect, it } from 'vitest';
import type { ActivityTimelineEvent } from '../../types';
import { buildTimelineSuggestions } from './timelineUtils';

function event(overrides: Partial<ActivityTimelineEvent>): ActivityTimelineEvent {
  return {
    id: 'timeline-1',
    eventType: 'activity',
    appName: 'Figma',
    windowTitle: 'Design System Audit',
    startedAt: '2026-06-02T09:00:00.000Z',
    endedAt: '2026-06-02T09:20:00.000Z',
    durationSeconds: 1200,
    source: 'system',
    projectId: null,
    timeEntryId: null,
    notes: '',
    isDismissed: false,
    createdAt: '2026-06-02T09:20:00.000Z',
    ...overrides,
  };
}

describe('buildTimelineSuggestions', () => {
  it('groups local app/window activity into suggested time entries', () => {
    const suggestions = buildTimelineSuggestions(
      [
        event({
          id: 'timeline-1',
          startedAt: '2026-06-02T09:00:00.000Z',
          endedAt: '2026-06-02T09:20:00.000Z',
        }),
        event({
          id: 'timeline-2',
          startedAt: '2026-06-02T09:25:00.000Z',
          endedAt: '2026-06-02T09:40:00.000Z',
        }),
        event({
          id: 'timeline-3',
          eventType: 'idle',
          appName: 'Idle',
          windowTitle: null,
          startedAt: '2026-06-02T09:40:00.000Z',
          endedAt: '2026-06-02T09:55:00.000Z',
          durationSeconds: 900,
        }),
        event({
          id: 'timeline-4',
          appName: 'Mail',
          windowTitle: 'Inbox',
          startedAt: '2026-06-02T10:00:00.000Z',
          endedAt: '2026-06-02T10:04:00.000Z',
          durationSeconds: 240,
        }),
        event({
          id: 'timeline-5',
          appName: 'VS Code',
          windowTitle: 'FlowForge',
          startedAt: '2026-06-02T10:05:00.000Z',
          endedAt: '2026-06-02T10:30:00.000Z',
          durationSeconds: 1500,
          timeEntryId: 'entry-1',
        }),
      ],
      { minDurationSeconds: 300 },
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toEqual(
      expect.objectContaining({
        title: 'Figma - Design System Audit',
        startedAt: '2026-06-02T09:00:00.000Z',
        endedAt: '2026-06-02T09:40:00.000Z',
        durationSeconds: 2100,
        eventIds: ['timeline-1', 'timeline-2'],
      }),
    );
    expect(suggestions[0].notes).toContain('Suggested from private timeline');
  });
});

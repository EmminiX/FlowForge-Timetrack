import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateActivityTimelineEventInput } from '../types';

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
  activityTimelineLogger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { activityTimelineService } from './activityTimelineService';

describe('activityTimelineService', () => {
  beforeEach(() => {
    dbMocks.select.mockReset();
    dbMocks.execute.mockReset();
  });

  it('records local active-window usage with app and window details', async () => {
    const randomUUID = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('00000000-0000-4000-8000-000000000201');
    dbMocks.execute.mockResolvedValue(undefined);

    const input: CreateActivityTimelineEventInput = {
      eventType: 'activity',
      appName: 'Figma',
      windowTitle: 'Design System Audit',
      startedAt: '2026-06-02T09:00:00.000Z',
      endedAt: '2026-06-02T09:18:00.000Z',
      source: 'system',
      notes: 'Auto-captured locally',
    };

    const event = await activityTimelineService.recordEvent(input);

    expect(dbMocks.execute.mock.calls[0][0]).toContain('INSERT INTO activity_timeline_events');
    expect(dbMocks.execute.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['activity', 'Figma', 'Design System Audit', 1080, 'system', 0]),
    );
    expect(event).toEqual(
      expect.objectContaining({
        id: '00000000-0000-4000-8000-000000000201',
        eventType: 'activity',
        appName: 'Figma',
        windowTitle: 'Design System Audit',
        durationSeconds: 1080,
        isDismissed: false,
      }),
    );

    randomUUID.mockRestore();
  });

  it('loads recent timeline events with boolean fields normalized', async () => {
    dbMocks.select.mockResolvedValue([
      {
        id: 'timeline-1',
        eventType: 'activity',
        appName: 'VS Code',
        windowTitle: 'Invoice polish',
        startedAt: '2026-06-02T10:00:00.000Z',
        endedAt: '2026-06-02T10:45:00.000Z',
        durationSeconds: 2700,
        source: 'system',
        projectId: 'project-1',
        timeEntryId: null,
        notes: '',
        isDismissed: 0,
        createdAt: '2026-06-02T10:45:00.000Z',
        projectName: 'Brand Refresh',
        projectColor: '#2563eb',
      },
    ]);

    const events = await activityTimelineService.getRecent({
      startDate: '2026-06-02T00:00:00.000Z',
      endDate: '2026-06-03T00:00:00.000Z',
    });

    expect(dbMocks.select.mock.calls[0][0]).toContain('atl.started_at >= $1');
    expect(dbMocks.select.mock.calls[0][0]).toContain('atl.started_at <= $2');
    expect(events[0]).toEqual(
      expect.objectContaining({
        isDismissed: false,
        projectName: 'Brand Refresh',
        projectColor: '#2563eb',
      }),
    );
  });

  it('records idle gaps and links suggested events to a saved time entry', async () => {
    const randomUUID = vi
      .spyOn(crypto, 'randomUUID')
      .mockReturnValue('00000000-0000-4000-8000-000000000202');
    dbMocks.execute.mockResolvedValue(undefined);

    const idle = await activityTimelineService.recordIdleGap({
      startedAt: '2026-06-02T11:00:00.000Z',
      endedAt: '2026-06-02T11:12:00.000Z',
    });

    expect(idle).toEqual(
      expect.objectContaining({
        eventType: 'idle',
        appName: 'Idle',
        durationSeconds: 720,
      }),
    );

    await activityTimelineService.linkTimeEntry(['timeline-1', 'timeline-2'], 'entry-1');

    expect(dbMocks.execute.mock.calls[1][0]).toContain('time_entry_id = $1');
    expect(dbMocks.execute.mock.calls[1][1]).toEqual(['entry-1', 'timeline-1', 'timeline-2']);

    randomUUID.mockRestore();
  });
});

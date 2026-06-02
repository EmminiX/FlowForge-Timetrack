import { describe, expect, it } from 'vitest';
import type { TimeEntryWithProject } from '../../types';
import {
  buildCalendarBlocks,
  findCalendarGaps,
  getWeekDays,
  moveCalendarEntry,
  resizeCalendarEntry,
} from './calendarUtils';

function entry(
  id: string,
  startTime: string,
  endTime: string,
  projectName = 'Brand Refresh',
): TimeEntryWithProject {
  return {
    id,
    projectId: `project-${projectName}`,
    projectName,
    projectColor: '#14b8a6',
    clientId: 'client-1',
    clientName: 'Acme Studio',
    startTime,
    endTime,
    pauseDuration: 0,
    notes: '',
    isBillable: true,
    isBilled: false,
    createdAt: startTime,
  };
}

describe('calendarUtils', () => {
  it('returns Monday-first week days for a selected date', () => {
    const days = getWeekDays(new Date('2026-06-03T12:00:00.000Z'));

    expect(days.map((day) => day.dateKey)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
      '2026-06-06',
      '2026-06-07',
    ]);
  });

  it('maps entries to calendar blocks with minute positions', () => {
    const [block] = buildCalendarBlocks([
      entry('entry-1', '2026-06-02T09:00:00.000Z', '2026-06-02T10:30:00.000Z'),
    ]);

    expect(block).toEqual(
      expect.objectContaining({
        id: 'entry-1',
        dateKey: '2026-06-02',
        startMinutes: 540,
        endMinutes: 630,
        durationMinutes: 90,
        column: 0,
        columnCount: 1,
      }),
    );
  });

  it('assigns columns to overlapping entries on the same day', () => {
    const blocks = buildCalendarBlocks([
      entry('entry-1', '2026-06-02T09:00:00.000Z', '2026-06-02T11:00:00.000Z'),
      entry('entry-2', '2026-06-02T10:00:00.000Z', '2026-06-02T12:00:00.000Z'),
      entry('entry-3', '2026-06-02T12:30:00.000Z', '2026-06-02T13:00:00.000Z'),
    ]);

    expect(blocks.find((block) => block.id === 'entry-1')).toEqual(
      expect.objectContaining({ column: 0, columnCount: 2 }),
    );
    expect(blocks.find((block) => block.id === 'entry-2')).toEqual(
      expect.objectContaining({ column: 1, columnCount: 2 }),
    );
    expect(blocks.find((block) => block.id === 'entry-3')).toEqual(
      expect.objectContaining({ column: 0, columnCount: 1 }),
    );
  });

  it('finds useful gaps between entries inside working hours', () => {
    const gaps = findCalendarGaps(
      [
        entry('entry-1', '2026-06-02T09:00:00.000Z', '2026-06-02T10:00:00.000Z'),
        entry('entry-2', '2026-06-02T12:00:00.000Z', '2026-06-02T13:30:00.000Z'),
      ],
      '2026-06-02',
      { dayStartMinutes: 9 * 60, dayEndMinutes: 17 * 60, minGapMinutes: 60 },
    );

    expect(gaps).toEqual([
      expect.objectContaining({ startMinutes: 600, endMinutes: 720, durationMinutes: 120 }),
      expect.objectContaining({ startMinutes: 810, endMinutes: 1020, durationMinutes: 210 }),
    ]);
  });

  it('resizes entries with snapping and a minimum duration', () => {
    expect(
      resizeCalendarEntry(
        {
          startTime: '2026-06-02T09:00:00.000Z',
          endTime: '2026-06-02T10:00:00.000Z',
        },
        'end',
        20,
        { snapMinutes: 15, minDurationMinutes: 30 },
      ),
    ).toEqual({
      startTime: '2026-06-02T09:00:00.000Z',
      endTime: '2026-06-02T10:15:00.000Z',
    });

    expect(
      resizeCalendarEntry(
        {
          startTime: '2026-06-02T09:00:00.000Z',
          endTime: '2026-06-02T10:00:00.000Z',
        },
        'start',
        50,
        { snapMinutes: 15, minDurationMinutes: 30 },
      ),
    ).toEqual({
      startTime: '2026-06-02T09:30:00.000Z',
      endTime: '2026-06-02T10:00:00.000Z',
    });
  });

  it('resizes entries inside working-hour clamps', () => {
    expect(
      resizeCalendarEntry(
        {
          startTime: '2026-06-02T08:15:00.000Z',
          endTime: '2026-06-02T09:00:00.000Z',
        },
        'start',
        -30,
        {
          snapMinutes: 15,
          minDurationMinutes: 30,
          dayStartMinutes: 8 * 60,
          dayEndMinutes: 18 * 60,
        },
      ),
    ).toEqual({
      startTime: '2026-06-02T08:00:00.000Z',
      endTime: '2026-06-02T09:00:00.000Z',
    });

    expect(
      resizeCalendarEntry(
        {
          startTime: '2026-06-02T17:00:00.000Z',
          endTime: '2026-06-02T17:45:00.000Z',
        },
        'end',
        30,
        {
          snapMinutes: 15,
          minDurationMinutes: 30,
          dayStartMinutes: 8 * 60,
          dayEndMinutes: 18 * 60,
        },
      ),
    ).toEqual({
      startTime: '2026-06-02T17:00:00.000Z',
      endTime: '2026-06-02T18:00:00.000Z',
    });
  });

  it('moves entries in snapped increments while preserving duration and working-hour bounds', () => {
    expect(
      moveCalendarEntry(
        {
          startTime: '2026-06-02T09:00:00.000Z',
          endTime: '2026-06-02T10:00:00.000Z',
        },
        28,
        {
          pixelsPerHour: 56,
          snapMinutes: 15,
          dayStartMinutes: 8 * 60,
          dayEndMinutes: 18 * 60,
        },
      ),
    ).toEqual({
      startTime: '2026-06-02T09:30:00.000Z',
      endTime: '2026-06-02T10:30:00.000Z',
    });

    expect(
      moveCalendarEntry(
        {
          startTime: '2026-06-02T08:15:00.000Z',
          endTime: '2026-06-02T08:45:00.000Z',
        },
        -60,
        {
          pixelsPerHour: 56,
          snapMinutes: 15,
          dayStartMinutes: 8 * 60,
          dayEndMinutes: 18 * 60,
        },
      ),
    ).toEqual({
      startTime: '2026-06-02T08:00:00.000Z',
      endTime: '2026-06-02T08:30:00.000Z',
    });
  });
});

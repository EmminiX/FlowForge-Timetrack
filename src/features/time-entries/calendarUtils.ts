import type { TimeEntryWithProject } from '../../types';

export interface CalendarDay {
  date: Date;
  dateKey: string;
  label: string;
  shortLabel: string;
}

export interface CalendarBlock {
  id: string;
  entry: TimeEntryWithProject;
  dateKey: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  topPercent: number;
  heightPercent: number;
  column: number;
  columnCount: number;
}

export interface CalendarGap {
  dateKey: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  startTime: string;
  endTime: string;
}

interface GapOptions {
  dayStartMinutes?: number;
  dayEndMinutes?: number;
  minGapMinutes?: number;
}

interface ResizeOptions {
  snapMinutes?: number;
  minDurationMinutes?: number;
}

const DAY_MINUTES = 24 * 60;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function minutesFromDate(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function isoAtMinutes(dateKey: string, minutes: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCMinutes(minutes);
  return date.toISOString();
}

export function getWeekDays(selectedDate: Date): CalendarDay[] {
  const selectedDay = startOfUtcDay(selectedDate);
  const dayOfWeek = selectedDay.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = addUtcDays(selectedDay, mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addUtcDays(monday, index);
    return {
      date,
      dateKey: getDateKey(date),
      label: DAY_LABELS[date.getUTCDay()],
      shortLabel: `${DAY_LABELS[date.getUTCDay()]} ${date.getUTCDate()}`,
    };
  });
}

function toBlock(entry: TimeEntryWithProject): CalendarBlock {
  const start = new Date(entry.startTime);
  const end = entry.endTime ? new Date(entry.endTime) : new Date();
  const startMinutes = minutesFromDate(start);
  const endMinutes = Math.max(minutesFromDate(end), startMinutes + 1);
  const durationMinutes = endMinutes - startMinutes;

  return {
    id: entry.id,
    entry,
    dateKey: getDateKey(start),
    startMinutes,
    endMinutes,
    durationMinutes,
    topPercent: (startMinutes / DAY_MINUTES) * 100,
    heightPercent: (durationMinutes / DAY_MINUTES) * 100,
    column: 0,
    columnCount: 1,
  };
}

function assignColumns(blocks: CalendarBlock[]): CalendarBlock[] {
  const sorted = [...blocks].sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
  const assigned: CalendarBlock[] = [];
  let index = 0;

  while (index < sorted.length) {
    const cluster: CalendarBlock[] = [sorted[index]];
    let clusterEnd = sorted[index].endMinutes;
    index += 1;

    while (index < sorted.length && sorted[index].startMinutes < clusterEnd) {
      cluster.push(sorted[index]);
      clusterEnd = Math.max(clusterEnd, sorted[index].endMinutes);
      index += 1;
    }

    const columnEnds: number[] = [];
    cluster.forEach((block) => {
      const freeColumn = columnEnds.findIndex((endMinutes) => endMinutes <= block.startMinutes);
      const column = freeColumn >= 0 ? freeColumn : columnEnds.length;
      columnEnds[column] = block.endMinutes;
      assigned.push({ ...block, column });
    });

    const columnCount = Math.max(1, columnEnds.length);
    assigned.slice(assigned.length - cluster.length).forEach((block) => {
      block.columnCount = columnCount;
    });
  }

  return assigned;
}

export function buildCalendarBlocks(entries: TimeEntryWithProject[]): CalendarBlock[] {
  const blocksByDay = new Map<string, CalendarBlock[]>();

  entries.forEach((entry) => {
    const block = toBlock(entry);
    const dayBlocks = blocksByDay.get(block.dateKey) ?? [];
    dayBlocks.push(block);
    blocksByDay.set(block.dateKey, dayBlocks);
  });

  return Array.from(blocksByDay.values()).flatMap(assignColumns);
}

export function findCalendarGaps(
  entries: TimeEntryWithProject[],
  dateKey: string,
  options: GapOptions = {},
): CalendarGap[] {
  const dayStartMinutes = options.dayStartMinutes ?? 8 * 60;
  const dayEndMinutes = options.dayEndMinutes ?? 18 * 60;
  const minGapMinutes = options.minGapMinutes ?? 30;

  const intervals = buildCalendarBlocks(entries)
    .filter((block) => block.dateKey === dateKey)
    .map((block) => ({
      startMinutes: Math.max(dayStartMinutes, block.startMinutes),
      endMinutes: Math.min(dayEndMinutes, block.endMinutes),
    }))
    .filter((interval) => interval.endMinutes > interval.startMinutes)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const gaps: CalendarGap[] = [];
  let cursor = dayStartMinutes;

  intervals.forEach((interval) => {
    if (interval.startMinutes - cursor >= minGapMinutes) {
      gaps.push({
        dateKey,
        startMinutes: cursor,
        endMinutes: interval.startMinutes,
        durationMinutes: interval.startMinutes - cursor,
        startTime: isoAtMinutes(dateKey, cursor),
        endTime: isoAtMinutes(dateKey, interval.startMinutes),
      });
    }
    cursor = Math.max(cursor, interval.endMinutes);
  });

  if (dayEndMinutes - cursor >= minGapMinutes) {
    gaps.push({
      dateKey,
      startMinutes: cursor,
      endMinutes: dayEndMinutes,
      durationMinutes: dayEndMinutes - cursor,
      startTime: isoAtMinutes(dateKey, cursor),
      endTime: isoAtMinutes(dateKey, dayEndMinutes),
    });
  }

  return gaps;
}

export function resizeCalendarEntry(
  entry: Pick<TimeEntryWithProject, 'startTime' | 'endTime'>,
  edge: 'start' | 'end',
  deltaMinutes: number,
  options: ResizeOptions = {},
): { startTime: string; endTime: string } {
  const snapMinutes = options.snapMinutes ?? 15;
  const minDurationMinutes = options.minDurationMinutes ?? 15;
  const snappedDelta = Math.round(deltaMinutes / snapMinutes) * snapMinutes;
  const start = new Date(entry.startTime);
  const end = entry.endTime ? new Date(entry.endTime) : new Date();
  const minDurationMs = minDurationMinutes * 60 * 1000;

  if (edge === 'start') {
    const candidate = new Date(start.getTime() + snappedDelta * 60 * 1000);
    const latestStart = new Date(end.getTime() - minDurationMs);
    return {
      startTime: new Date(Math.min(candidate.getTime(), latestStart.getTime())).toISOString(),
      endTime: end.toISOString(),
    };
  }

  const candidate = new Date(end.getTime() + snappedDelta * 60 * 1000);
  const earliestEnd = new Date(start.getTime() + minDurationMs);
  return {
    startTime: start.toISOString(),
    endTime: new Date(Math.max(candidate.getTime(), earliestEnd.getTime())).toISOString(),
  };
}

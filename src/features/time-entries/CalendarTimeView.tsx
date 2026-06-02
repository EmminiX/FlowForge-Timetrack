import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus, RotateCcw } from 'lucide-react';
import type { CreateTimeEntryInput, Project, TimeEntryWithProject } from '../../types';
import { formatDurationShort } from '../../types';
import { Button, Modal, ModalFooter, Select, Textarea, Input } from '../../components/ui';
import { projectService, timeEntryService } from '../../services';
import {
  buildCalendarBlocks,
  findCalendarGaps,
  getDateKey,
  getWeekDays,
  resizeCalendarEntry,
  type CalendarBlock,
  type CalendarGap,
} from './calendarUtils';

type CalendarMode = 'day' | 'week';

interface CalendarTimeViewProps {
  initialDate?: Date;
}

const HOUR_HEIGHT = 56;
const DAY_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 18 * 60;
const GRID_MINUTES = DAY_END_MINUTES - DAY_START_MINUTES;

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function getRange(mode: CalendarMode, selectedDate: Date): { start: Date; end: Date } {
  if (mode === 'week') {
    const days = getWeekDays(selectedDate);
    return {
      start: days[0].date,
      end: addDays(days[6].date, 1),
    };
  }

  const dateKey = getDateKey(selectedDate);
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  return { start, end: addDays(start, 1) };
}

function getVisibleDays(mode: CalendarMode, selectedDate: Date) {
  if (mode === 'week') return getWeekDays(selectedDate);
  const dateKey = getDateKey(selectedDate);
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  const label = date.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  });
  return [
    {
      date,
      dateKey,
      label,
      shortLabel: `${label} ${date.getUTCDate()}`,
    },
  ];
}

function clampBlock(block: CalendarBlock) {
  const start = Math.max(block.startMinutes, DAY_START_MINUTES);
  const end = Math.min(block.endMinutes, DAY_END_MINUTES);
  return {
    top: ((start - DAY_START_MINUTES) / GRID_MINUTES) * 100,
    height: Math.max(5, ((end - start) / GRID_MINUTES) * 100),
  };
}

export function CalendarTimeView({ initialDate }: CalendarTimeViewProps) {
  const [mode, setMode] = useState<CalendarMode>('day');
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [entries, setEntries] = useState<TimeEntryWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddGap, setQuickAddGap] = useState<CalendarGap | null>(null);
  const [saving, setSaving] = useState(false);

  const visibleDays = useMemo(() => getVisibleDays(mode, selectedDate), [mode, selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const range = getRange(mode, selectedDate);
      const [entryData, projectData] = await Promise.all([
        timeEntryService.getByDateRange(range.start.toISOString(), range.end.toISOString()),
        projectService.getAll(),
      ]);
      setEntries(entryData);
      setProjects(projectData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedDate]);

  const blocks = useMemo(() => buildCalendarBlocks(entries), [entries]);
  const blocksByDay = useMemo(() => {
    const map = new Map<string, CalendarBlock[]>();
    blocks.forEach((block) => {
      const dayBlocks = map.get(block.dateKey) || [];
      dayBlocks.push(block);
      map.set(block.dateKey, dayBlocks);
    });
    return map;
  }, [blocks]);

  const gapsByDay = useMemo(() => {
    const map = new Map<string, CalendarGap[]>();
    visibleDays.forEach((day) => {
      map.set(
        day.dateKey,
        findCalendarGaps(entries, day.dateKey, {
          dayStartMinutes: DAY_START_MINUTES,
          dayEndMinutes: DAY_END_MINUTES,
          minGapMinutes: 60,
        }),
      );
    });
    return map;
  }, [entries, visibleDays]);

  const handleResize = async (block: CalendarBlock, edge: 'start' | 'end', deltaMinutes: number) => {
    const next = resizeCalendarEntry(block.entry, edge, deltaMinutes, {
      snapMinutes: 15,
      minDurationMinutes: 30,
    });
    await timeEntryService.update(block.id, edge === 'start' ? { startTime: next.startTime } : { endTime: next.endTime });
    await loadData();
  };

  const handleQuickCreate = async (input: CreateTimeEntryInput) => {
    setSaving(true);
    try {
      await timeEntryService.create(input);
      setQuickAddGap(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const hourLabels = Array.from(
    { length: (DAY_END_MINUTES - DAY_START_MINUTES) / 60 + 1 },
    (_, index) => DAY_START_MINUTES + index * 60,
  );

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Calendar Time</h1>
          <p className='text-sm text-muted-foreground'>Spot gaps, resize entries, and add missed work.</p>
        </div>

        <div className='flex items-center gap-2'>
          <div role='tablist' aria-label='Calendar view' className='flex rounded-md border border-border bg-[var(--surface-raised)] p-1'>
            {(['day', 'week'] as const).map((view) => (
              <button
                key={view}
                type='button'
                role='tab'
                aria-selected={mode === view}
                onClick={() => setMode(view)}
                className={`min-h-9 rounded px-3 text-sm font-medium capitalize transition-colors ${
                  mode === view ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {view === 'day' ? 'Day' : 'Week'}
              </button>
            ))}
          </div>
          <Button variant='outline' size='sm' onClick={() => setSelectedDate(addDays(selectedDate, mode === 'week' ? -7 : -1))}>
            <ChevronLeft className='w-4 h-4' />
            Previous
          </Button>
          <Button variant='outline' size='sm' onClick={() => setSelectedDate(new Date())}>
            <RotateCcw className='w-4 h-4' />
            Today
          </Button>
          <Button variant='outline' size='sm' onClick={() => setSelectedDate(addDays(selectedDate, mode === 'week' ? 7 : 1))}>
            Next
            <ChevronRight className='w-4 h-4' />
          </Button>
        </div>
      </div>

      <div className='rounded-md border border-border bg-[var(--surface-raised)]'>
        <div
          className='grid border-b border-border'
          style={{ gridTemplateColumns: `72px repeat(${visibleDays.length}, minmax(140px, 1fr))` }}
        >
          <div className='px-3 py-2 text-xs font-medium uppercase text-muted-foreground'>
            Time
          </div>
          {visibleDays.map((day) => (
            <div key={day.dateKey} className='border-l border-border px-3 py-2 text-sm font-semibold'>
              {day.shortLabel}
            </div>
          ))}
        </div>

        <div
          className='grid overflow-x-auto'
          style={{
            gridTemplateColumns: `72px repeat(${visibleDays.length}, minmax(140px, 1fr))`,
            minHeight: GRID_MINUTES * (HOUR_HEIGHT / 60),
          }}
        >
          <div className='relative border-r border-border'>
            {hourLabels.map((minutes) => (
              <div
                key={minutes}
                className='absolute right-2 text-xs text-muted-foreground'
                style={{ top: `${((minutes - DAY_START_MINUTES) / GRID_MINUTES) * 100}%` }}
              >
                {formatTime(minutes)}
              </div>
            ))}
          </div>

          {visibleDays.map((day) => (
            <div key={day.dateKey} className='relative border-l border-border'>
              {hourLabels.map((minutes) => (
                <div
                  key={`${day.dateKey}-${minutes}`}
                  className='absolute left-0 right-0 border-t border-border/70'
                  style={{ top: `${((minutes - DAY_START_MINUTES) / GRID_MINUTES) * 100}%` }}
                />
              ))}

              {(gapsByDay.get(day.dateKey) || []).map((gap) => (
                <button
                  key={`${gap.dateKey}-${gap.startMinutes}`}
                  type='button'
                  aria-label={`Add missed work ${formatTime(gap.startMinutes)} to ${formatTime(gap.endMinutes)}`}
                  onClick={() => setQuickAddGap(gap)}
                  className='absolute left-2 right-2 flex items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring'
                  style={{
                    top: `${((gap.startMinutes - DAY_START_MINUTES) / GRID_MINUTES) * 100}%`,
                    height: `${Math.max(7, (gap.durationMinutes / GRID_MINUTES) * 100)}%`,
                  }}
                >
                  <Plus className='mr-1 h-3 w-3' />
                  {formatTime(gap.startMinutes)} gap
                </button>
              ))}

              {(blocksByDay.get(day.dateKey) || []).map((block) => {
                const position = clampBlock(block);
                const width = 100 / block.columnCount;
                return (
                  <div
                    key={block.id}
                    className='absolute rounded-md border border-primary/40 bg-primary/15 p-2 shadow-[var(--shadow-subtle)]'
                    style={{
                      top: `${position.top}%`,
                      height: `${position.height}%`,
                      left: `calc(${block.column * width}% + 0.25rem)`,
                      width: `calc(${width}% - 0.5rem)`,
                    }}
                  >
                    <div className='flex h-full min-h-14 flex-col overflow-hidden'>
                      <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                        <Clock className='h-3 w-3' />
                        {formatTime(block.startMinutes)}-{formatTime(block.endMinutes)}
                      </div>
                      <div className='truncate text-sm font-semibold text-foreground'>
                        {block.entry.projectName}
                      </div>
                      {block.entry.notes && (
                        <div className='truncate text-xs text-muted-foreground'>{block.entry.notes}</div>
                      )}
                      <div className='mt-auto flex items-center justify-between gap-1 pt-1'>
                        <span className='text-xs text-muted-foreground'>
                          {formatDurationShort(block.durationMinutes * 60)}
                        </span>
                        <div className='flex gap-1'>
                          <button
                            type='button'
                            aria-label={`Shrink ${block.entry.projectName} by 15 minutes`}
                            onClick={() => void handleResize(block, 'end', -15)}
                            className='grid h-6 w-6 place-items-center rounded border border-border bg-background text-xs hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring'
                          >
                            -
                          </button>
                          <button
                            type='button'
                            aria-label={`Extend ${block.entry.projectName} by 15 minutes`}
                            onClick={() => void handleResize(block, 'end', 15)}
                            className='grid h-6 w-6 place-items-center rounded border border-border bg-background text-xs hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring'
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div className='text-sm text-muted-foreground'>Loading calendar entries...</div>
      )}

      {quickAddGap && (
        <GapQuickAddModal
          gap={quickAddGap}
          projects={projects}
          loading={saving}
          onClose={() => setQuickAddGap(null)}
          onSave={handleQuickCreate}
        />
      )}
    </div>
  );
}

function GapQuickAddModal({
  gap,
  projects,
  loading,
  onClose,
  onSave,
}: {
  gap: CalendarGap;
  projects: Project[];
  loading: boolean;
  onClose: () => void;
  onSave: (input: CreateTimeEntryInput) => Promise<void>;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [isBillable, setIsBillable] = useState(true);

  return (
    <Modal isOpen={true} onClose={onClose} title='Add Missed Work' size='lg'>
      <form
        className='space-y-4'
        onSubmit={(event) => {
          event.preventDefault();
          if (!projectId) return;
          void onSave({
            projectId,
            startTime: gap.startTime,
            endTime: gap.endTime,
            pauseDuration: 0,
            notes,
            isBillable,
            isBilled: false,
          });
        }}
      >
        <div className='rounded-md bg-muted p-3 text-sm'>
          {formatTime(gap.startMinutes)} to {formatTime(gap.endMinutes)} ·{' '}
          {formatDurationShort(gap.durationMinutes * 60)}
        </div>
        <Select
          label='Project *'
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
          placeholder='Choose a project'
          disabled={projects.length === 0}
        />
        <Input label='Start' value={gap.startTime} disabled />
        <Input label='End' value={gap.endTime} disabled />
        <Textarea
          label='Notes'
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder='What did you work on?'
          rows={2}
        />
        <div className='flex items-center gap-2'>
          <input
            type='checkbox'
            id='calendar-gap-billable'
            checked={isBillable}
            onChange={(event) => setIsBillable(event.target.checked)}
            className='rounded border-border'
          />
          <label htmlFor='calendar-gap-billable' className='text-sm'>
            This time is billable
          </label>
        </div>
        <ModalFooter>
          <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type='submit' loading={loading} disabled={!projectId}>
            Save Time
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

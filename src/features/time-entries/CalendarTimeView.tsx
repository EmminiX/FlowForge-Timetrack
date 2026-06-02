import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ChevronLeft, ChevronRight, Clock, GripHorizontal, Plus, RotateCcw } from 'lucide-react';
import type {
  CreateTimeEntryInput,
  Project,
  TimeEntryWithProject,
  UpdateTimeEntryInput,
} from '../../types';
import { formatDurationShort } from '../../types';
import { Button, Modal, ModalFooter, Select, Textarea, Input } from '../../components/ui';
import { projectService, timeEntryService } from '../../services';
import {
  datetimeInputValueToIso,
  getDurationSecondsFromLocalInputs,
  toLocalDatetimeInputValue,
} from '../../lib/dateTimeInput';
import {
  buildCalendarBlocks,
  findCalendarGaps,
  getDateKey,
  getWeekDays,
  moveCalendarEntry,
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
const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 30;

type CalendarInteraction =
  | {
      kind: 'move';
      block: CalendarBlock;
      startY: number;
      pointerId: number;
      moved: boolean;
    }
  | {
      kind: 'resize';
      block: CalendarBlock;
      edge: 'start' | 'end';
      startY: number;
      pointerId: number;
      moved: boolean;
    };

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

interface TimeFormErrors {
  projectId?: string;
  startTime?: string;
  endTime?: string;
}

function validateTimeFields({
  projectId,
  startTime,
  endTime,
  requireProject,
}: {
  projectId?: string;
  startTime: string;
  endTime: string;
  requireProject: boolean;
}): TimeFormErrors {
  const errors: TimeFormErrors = {};
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (requireProject && !projectId) {
    errors.projectId = 'Choose a project first.';
  }

  if (!startTime || Number.isNaN(start)) {
    errors.startTime = 'Enter a valid start time.';
  }

  if (!endTime || Number.isNaN(end)) {
    errors.endTime = 'Enter a valid end time.';
  } else if (!Number.isNaN(start) && end <= start) {
    errors.endTime = 'End must be after start.';
  }

  return errors;
}

function hasErrors(errors: TimeFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function CalendarTimeView({ initialDate }: CalendarTimeViewProps) {
  const [mode, setMode] = useState<CalendarMode>('day');
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [entries, setEntries] = useState<TimeEntryWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddGap, setQuickAddGap] = useState<CalendarGap | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimeEntryWithProject | null>(null);
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const interactionRef = useRef<CalendarInteraction | null>(null);

  const visibleDays = useMemo(() => getVisibleDays(mode, selectedDate), [mode, selectedDate]);

  const loadData = useCallback(async () => {
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
  }, [mode, selectedDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

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

  const handleResize = useCallback(
    async (block: CalendarBlock, edge: 'start' | 'end', deltaMinutes: number) => {
      const next = resizeCalendarEntry(block.entry, edge, deltaMinutes, {
        snapMinutes: SNAP_MINUTES,
        minDurationMinutes: MIN_DURATION_MINUTES,
        dayStartMinutes: DAY_START_MINUTES,
        dayEndMinutes: DAY_END_MINUTES,
      });
      await timeEntryService.update(
        block.id,
        edge === 'start' ? { startTime: next.startTime } : { endTime: next.endTime },
      );
      await loadData();
    },
    [loadData],
  );

  const handleMove = useCallback(
    async (block: CalendarBlock, deltaPixels: number) => {
      const next = moveCalendarEntry(block.entry, deltaPixels, {
        pixelsPerHour: HOUR_HEIGHT,
        snapMinutes: SNAP_MINUTES,
        dayStartMinutes: DAY_START_MINUTES,
        dayEndMinutes: DAY_END_MINUTES,
      });

      if (next.startTime === block.entry.startTime && next.endTime === block.entry.endTime) {
        return;
      }

      await timeEntryService.update(block.id, {
        startTime: next.startTime,
        endTime: next.endTime,
      });
      await loadData();
    },
    [loadData],
  );

  const handleEditSave = useCallback(
    async (id: string, updates: UpdateTimeEntryInput) => {
      setSaving(true);
      try {
        await timeEntryService.update(id, updates);
        setEditingEntry(null);
        await loadData();
      } finally {
        setSaving(false);
      }
    },
    [loadData],
  );

  const startMoveInteraction = (
    event: ReactPointerEvent<HTMLButtonElement>,
    block: CalendarBlock,
  ) => {
    if (event.button !== 0) return;

    interactionRef.current = {
      kind: 'move',
      block,
      startY: event.clientY,
      pointerId: event.pointerId,
      moved: false,
    };
  };

  const startResizeInteraction = (
    event: ReactPointerEvent<HTMLButtonElement>,
    block: CalendarBlock,
    edge: 'start' | 'end',
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();

    interactionRef.current = {
      kind: 'resize',
      block,
      edge,
      startY: event.clientY,
      pointerId: event.pointerId,
      moved: false,
    };
  };

  const handleResizeKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    block: CalendarBlock,
    edge: 'start' | 'end',
  ) => {
    const deltaByKey: Record<string, number | undefined> = {
      ArrowUp: edge === 'start' ? -SNAP_MINUTES : -SNAP_MINUTES,
      ArrowDown: edge === 'start' ? SNAP_MINUTES : SNAP_MINUTES,
      PageUp: edge === 'start' ? -60 : -60,
      PageDown: edge === 'start' ? 60 : 60,
    };

    const delta = deltaByKey[event.key];
    if (delta === undefined) return;

    event.preventDefault();
    void handleResize(block, edge, delta);
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction || event.pointerId !== interaction.pointerId) return;

      const deltaPixels = event.clientY - interaction.startY;
      if (Math.abs(deltaPixels) < 4) return;

      interaction.moved = true;
      setActiveInteractionId(interaction.block.id);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction || event.pointerId !== interaction.pointerId) return;

      interactionRef.current = null;
      // Delay clearing so a drag doesn't also trigger the block's click handler.
      setTimeout(() => setActiveInteractionId(null), 0);
      const deltaPixels = event.clientY - interaction.startY;
      if (!interaction.moved || Math.abs(deltaPixels) < 4) return;

      const deltaMinutes = (deltaPixels / HOUR_HEIGHT) * 60;

      if (interaction.kind === 'move') {
        void handleMove(interaction.block, deltaPixels);
        return;
      }

      void handleResize(interaction.block, interaction.edge, deltaMinutes);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handleMove, handleResize]);

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
          <p className='text-sm text-muted-foreground'>
            Spot gaps, resize entries, and add missed work.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <div
            role='tablist'
            aria-label='Calendar view'
            className='flex rounded-md border border-border bg-[var(--surface-raised)] p-1'
          >
            {(['day', 'week'] as const).map((view) => (
              <button
                key={view}
                type='button'
                role='tab'
                aria-selected={mode === view}
                onClick={() => setMode(view)}
                className={`min-h-9 rounded px-3 text-sm font-medium capitalize transition-colors ${
                  mode === view
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {view === 'day' ? 'Day' : 'Week'}
              </button>
            ))}
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setSelectedDate(addDays(selectedDate, mode === 'week' ? -7 : -1))}
          >
            <ChevronLeft className='w-4 h-4' />
            Previous
          </Button>
          <Button variant='outline' size='sm' onClick={() => setSelectedDate(new Date())}>
            <RotateCcw className='w-4 h-4' />
            Today
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setSelectedDate(addDays(selectedDate, mode === 'week' ? 7 : 1))}
          >
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
          <div className='px-3 py-2 text-xs font-medium uppercase text-muted-foreground'>Time</div>
          {visibleDays.map((day) => (
            <div
              key={day.dateKey}
              className='border-l border-border px-3 py-2 text-sm font-semibold'
            >
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
                const isInteracting = activeInteractionId === block.id;
                return (
                  <div
                    key={block.id}
                    className={`absolute overflow-hidden rounded-md border border-primary/40 bg-primary/15 shadow-[var(--shadow-subtle)] transition-[box-shadow,border-color,background-color] ${
                      isInteracting
                        ? 'border-primary bg-primary/25 shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-primary)_45%,transparent)]'
                        : ''
                    }`}
                    style={{
                      top: `${position.top}%`,
                      height: `${position.height}%`,
                      left: `calc(${block.column * width}% + 0.25rem)`,
                      width: `calc(${width}% - 0.5rem)`,
                    }}
                  >
                    <button
                      type='button'
                      aria-label={`Move or edit ${block.entry.projectName} time entry`}
                      onClick={() => setEditingEntry(block.entry)}
                      onPointerDown={(event) => startMoveInteraction(event, block)}
                      className='flex h-full min-h-14 w-full cursor-grab flex-col overflow-hidden px-2 py-3 text-left transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-ring active:cursor-grabbing'
                    >
                      <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                        <Clock className='h-3 w-3' />
                        {formatTime(block.startMinutes)}-{formatTime(block.endMinutes)}
                      </div>
                      <div className='truncate text-sm font-semibold text-foreground'>
                        {block.entry.projectName}
                      </div>
                      {block.entry.notes && (
                        <div className='truncate text-xs text-muted-foreground'>
                          {block.entry.notes}
                        </div>
                      )}
                      <div className='mt-auto flex items-center justify-between gap-1 pt-1'>
                        <span className='text-xs text-muted-foreground'>
                          {formatDurationShort(block.durationMinutes * 60)}
                        </span>
                      </div>
                    </button>
                    <button
                      type='button'
                      aria-label={`Adjust start time for ${block.entry.projectName}`}
                      title='Adjust start time'
                      onPointerDown={(event) => startResizeInteraction(event, block, 'start')}
                      onKeyDown={(event) => handleResizeKeyDown(event, block, 'start')}
                      className='absolute inset-x-1 top-0 z-20 flex min-h-11 cursor-ns-resize items-start justify-center rounded-t-md pt-1 text-primary/80 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-ring'
                    >
                      <GripHorizontal className='h-4 w-5' />
                    </button>
                    <button
                      type='button'
                      aria-label={`Adjust end time for ${block.entry.projectName}`}
                      title='Adjust end time'
                      onPointerDown={(event) => startResizeInteraction(event, block, 'end')}
                      onKeyDown={(event) => handleResizeKeyDown(event, block, 'end')}
                      className='absolute inset-x-1 bottom-0 z-20 flex min-h-11 cursor-ns-resize items-end justify-center rounded-b-md pb-1 text-primary/80 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-ring'
                    >
                      <GripHorizontal className='h-4 w-5' />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {loading && <div className='text-sm text-muted-foreground'>Loading calendar entries...</div>}

      {quickAddGap && (
        <GapQuickAddModal
          gap={quickAddGap}
          projects={projects}
          loading={saving}
          onClose={() => setQuickAddGap(null)}
          onSave={handleQuickCreate}
        />
      )}

      {editingEntry && (
        <CalendarEntryEditModal
          entry={editingEntry}
          loading={saving}
          onClose={() => setEditingEntry(null)}
          onSave={(updates) => handleEditSave(editingEntry.id, updates)}
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
  const [startTime, setStartTime] = useState(toLocalDatetimeInputValue(gap.startTime));
  const [endTime, setEndTime] = useState(toLocalDatetimeInputValue(gap.endTime));
  const [notes, setNotes] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [errors, setErrors] = useState<TimeFormErrors>({});

  const durationSeconds = getDurationSecondsFromLocalInputs(startTime, endTime);

  return (
    <Modal isOpen={true} onClose={onClose} title='Add Missed Work' size='lg'>
      <form
        className='space-y-4'
        onSubmit={(event) => {
          event.preventDefault();
          const nextErrors = validateTimeFields({
            projectId,
            startTime,
            endTime,
            requireProject: true,
          });
          setErrors(nextErrors);

          if (hasErrors(nextErrors)) return;

          void onSave({
            projectId,
            startTime: datetimeInputValueToIso(startTime),
            endTime: datetimeInputValueToIso(endTime),
            pauseDuration: 0,
            notes,
            isBillable,
            isBilled: false,
          });
        }}
      >
        <div className='rounded-md border border-border bg-muted/70 p-3 text-sm' aria-live='polite'>
          <span className='font-medium text-foreground'>
            {durationSeconds > 0 ? formatDurationShort(durationSeconds) : 'Choose a time range'}
          </span>
          <span className='text-muted-foreground'>
            {' '}
            · Suggested {formatTime(gap.startMinutes)} to {formatTime(gap.endMinutes)}
          </span>
        </div>
        <Select
          label='Project *'
          value={projectId}
          onChange={(event) => {
            setProjectId(event.target.value);
            setErrors((current) => ({ ...current, projectId: undefined }));
          }}
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
          placeholder='Choose a project'
          disabled={projects.length === 0}
          error={errors.projectId}
        />
        <div className='grid gap-4 sm:grid-cols-2'>
          <Input
            label='Start'
            type='datetime-local'
            value={startTime}
            onChange={(event) => {
              setStartTime(event.target.value);
              setErrors((current) => ({ ...current, startTime: undefined, endTime: undefined }));
            }}
            error={errors.startTime}
            required
          />
          <Input
            label='End'
            type='datetime-local'
            value={endTime}
            onChange={(event) => {
              setEndTime(event.target.value);
              setErrors((current) => ({ ...current, endTime: undefined }));
            }}
            error={errors.endTime}
            required
          />
        </div>
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
          <Button type='submit' loading={loading}>
            Save Time
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function CalendarEntryEditModal({
  entry,
  loading,
  onClose,
  onSave,
}: {
  entry: TimeEntryWithProject;
  loading: boolean;
  onClose: () => void;
  onSave: (updates: UpdateTimeEntryInput) => Promise<void>;
}) {
  const [startTime, setStartTime] = useState(toLocalDatetimeInputValue(entry.startTime));
  const [endTime, setEndTime] = useState(toLocalDatetimeInputValue(entry.endTime));
  const [notes, setNotes] = useState(entry.notes || '');
  const [isBillable, setIsBillable] = useState(entry.isBillable);
  const [errors, setErrors] = useState<TimeFormErrors>({});

  const durationSeconds = getDurationSecondsFromLocalInputs(
    startTime,
    endTime,
    entry.pauseDuration || 0,
  );

  return (
    <Modal isOpen={true} onClose={onClose} title='Edit Time Entry' size='lg'>
      <form
        className='space-y-4'
        onSubmit={(event) => {
          event.preventDefault();
          const nextErrors = validateTimeFields({
            startTime,
            endTime,
            requireProject: false,
          });
          setErrors(nextErrors);

          if (hasErrors(nextErrors)) return;

          void onSave({
            startTime: datetimeInputValueToIso(startTime),
            endTime: datetimeInputValueToIso(endTime),
            notes,
            isBillable,
          });
        }}
      >
        <div className='rounded-md border border-border bg-muted/70 p-3'>
          <div className='flex items-center gap-2 text-sm'>
            <span
              aria-hidden='true'
              className='h-3 w-3 rounded-full'
              style={{ backgroundColor: entry.projectColor }}
            />
            <span className='font-medium text-foreground'>{entry.projectName}</span>
            {entry.clientName && (
              <span className='text-muted-foreground'>· {entry.clientName}</span>
            )}
          </div>
        </div>

        <div className='grid gap-4 sm:grid-cols-2'>
          <Input
            label='Start'
            type='datetime-local'
            value={startTime}
            onChange={(event) => {
              setStartTime(event.target.value);
              setErrors((current) => ({ ...current, startTime: undefined, endTime: undefined }));
            }}
            error={errors.startTime}
            required
          />
          <Input
            label='End'
            type='datetime-local'
            value={endTime}
            onChange={(event) => {
              setEndTime(event.target.value);
              setErrors((current) => ({ ...current, endTime: undefined }));
            }}
            error={errors.endTime}
            required
          />
        </div>

        <div
          className='rounded-md border border-border bg-muted/70 p-3 text-center'
          aria-live='polite'
        >
          <span className='text-sm text-muted-foreground'>Duration: </span>
          <span className='font-mono font-medium text-foreground'>
            {durationSeconds > 0 ? formatDurationShort(durationSeconds) : 'Invalid range'}
          </span>
          {entry.pauseDuration > 0 && (
            <span className='ml-2 text-xs text-muted-foreground'>
              excl. {Math.round(entry.pauseDuration / 60)}m pause
            </span>
          )}
        </div>

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
            id='calendar-edit-billable'
            checked={isBillable}
            onChange={(event) => setIsBillable(event.target.checked)}
            className='rounded border-border'
          />
          <label htmlFor='calendar-edit-billable' className='text-sm'>
            This time is billable
          </label>
        </div>

        <ModalFooter>
          <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type='submit' loading={loading}>
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

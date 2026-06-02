import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, EyeOff, History, PauseCircle, Shield, Sparkles, Trash2 } from 'lucide-react';
import type {
  ActivityTimelineEventWithProject,
  CreateTimeEntryInput,
  Project,
  TimelineSuggestion,
} from '../../types';
import { formatDurationShort } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';
import { activityTimelineService, projectService, timeEntryService } from '../../services';
import { Badge, Button, Card, CardContent, EmptyState, Select } from '../../components/ui';

function formatTimeRange(startedAt: string, endedAt: string): string {
  const formatter = new Intl.DateTimeFormat('en-IE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${formatter.format(new Date(startedAt))} - ${formatter.format(new Date(endedAt))}`;
}

function eventLabel(event: ActivityTimelineEventWithProject): string {
  if (event.eventType === 'idle') return 'Away from computer';
  return event.windowTitle || 'App activity';
}

export function PrivateTimeline() {
  const { settings, updateSetting } = useSettings();
  const [events, setEvents] = useState<ActivityTimelineEventWithProject[]>([]);
  const [suggestions, setSuggestions] = useState<TimelineSuggestion[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enabled = Boolean(settings.enablePrivateTimeline);
  const minDurationSeconds = (settings.activityTimelineSuggestionMinMinutes || 5) * 60;

  const loadData = async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [timelineEvents, timelineSuggestions, activeProjects] = await Promise.all([
        activityTimelineService.getRecent({ includeDismissed: false }),
        activityTimelineService.getSuggestions({ minDurationSeconds }),
        projectService.getAll(),
      ]);
      setEvents(timelineEvents);
      setSuggestions(timelineSuggestions);
      setProjects(activeProjects);
      setSelectedProjectId((current) => current || activeProjects[0]?.id || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load private timeline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, minDurationSeconds]);

  const recentEvents = useMemo(() => events.slice(0, 12), [events]);

  const handleCreateSuggestion = async (suggestion: TimelineSuggestion) => {
    if (!selectedProjectId) {
      setError('Choose a project before creating a suggested entry.');
      return;
    }

    setSavingId(suggestion.id);
    setError(null);
    try {
      const input: CreateTimeEntryInput = {
        projectId: selectedProjectId,
        startTime: suggestion.startedAt,
        endTime: suggestion.endedAt,
        pauseDuration: 0,
        notes: suggestion.notes,
        isBillable: true,
        isBilled: false,
      };
      const entry = await timeEntryService.create(input);
      await activityTimelineService.linkTimeEntry(suggestion.eventIds, entry.id);
      await loadData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create time entry.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDismiss = async (suggestion: TimelineSuggestion) => {
    setSavingId(suggestion.id);
    try {
      await activityTimelineService.dismiss(suggestion.eventIds);
      await loadData();
    } finally {
      setSavingId(null);
    }
  };

  if (!enabled) {
    return (
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Private Auto-Timeline</h1>
          <p className='text-sm text-muted-foreground'>Off until you enable it</p>
        </div>

        <Card>
          <CardContent className='flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-start gap-3'>
              <div className='grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary'>
                <Shield className='h-5 w-5' />
              </div>
              <div className='space-y-2'>
                <div>
                  <h2 className='text-lg font-semibold text-foreground'>
                    Local-only and user-approved
                  </h2>
                  <p className='max-w-2xl text-sm text-muted-foreground'>
                    Timeline capture is disabled by default. It stores activity on this device only,
                    and suggestions become time entries only after you approve them.
                  </p>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Badge>No cloud sync</Badge>
                  <Badge>No invoice changes</Badge>
                  <Badge>Window titles off by default</Badge>
                </div>
              </div>
            </div>
            <Button onClick={() => updateSetting('enablePrivateTimeline', true)} className='gap-2'>
              <Shield className='h-4 w-4' />
              Enable Private Timeline
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Private Auto-Timeline</h1>
          <p className='text-sm text-muted-foreground'>
            Local activity, idle gaps, and suggested time entries.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Badge variant='success'>Local only</Badge>
          <Button
            variant='outline'
            size='sm'
            onClick={() => updateSetting('enablePrivateTimeline', false)}
            className='gap-2'
          >
            <EyeOff className='h-4 w-4' />
            Turn off
          </Button>
        </div>
      </div>

      {error && (
        <div className='rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive'>
          {error}
        </div>
      )}

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]'>
        <section className='space-y-4'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <h2 className='text-lg font-semibold text-foreground'>Suggested entries</h2>
              <p className='text-sm text-muted-foreground'>
                Review before anything becomes billable time.
              </p>
            </div>
            <Select
              label='Project'
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              options={projects.map((project) => ({ value: project.id, label: project.name }))}
              placeholder={projects.length === 0 ? 'Create a project first' : 'Choose project'}
              disabled={projects.length === 0}
            />
          </div>

          {loading ? (
            <Card>
              <CardContent className='text-sm text-muted-foreground'>
                Loading timeline...
              </CardContent>
            </Card>
          ) : suggestions.length === 0 ? (
            <EmptyState
              icon={<Sparkles className='h-8 w-8' />}
              title='No suggestions yet'
              description='New local activity will appear here after enough focused time is captured.'
            />
          ) : (
            <div className='space-y-3'>
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id}>
                  <CardContent className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                    <div className='min-w-0 space-y-2'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <h3 className='font-semibold text-foreground'>{suggestion.title}</h3>
                        <Badge>{formatDurationShort(suggestion.durationSeconds)}</Badge>
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        {formatTimeRange(suggestion.startedAt, suggestion.endedAt)}
                      </p>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        size='sm'
                        onClick={() => handleCreateSuggestion(suggestion)}
                        loading={savingId === suggestion.id}
                        disabled={projects.length === 0}
                        className='gap-2'
                      >
                        <Check className='h-4 w-4' />
                        Create suggested entry
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleDismiss(suggestion)}
                        disabled={savingId === suggestion.id}
                        className='gap-2'
                      >
                        <Trash2 className='h-4 w-4' />
                        Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <aside className='space-y-4'>
          <Card>
            <CardContent className='space-y-3'>
              <div className='flex items-center gap-2'>
                <History className='h-5 w-5 text-muted-foreground' />
                <h2 className='text-lg font-semibold text-foreground'>Recent timeline</h2>
              </div>
              <div className='space-y-3'>
                {recentEvents.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>No local activity captured yet.</p>
                ) : (
                  recentEvents.map((event) => (
                    <div key={event.id} className='rounded-md border border-border p-3'>
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-medium text-foreground'>
                            {event.eventType === 'idle' ? 'Idle gap' : event.appName}
                          </p>
                          <p className='truncate text-sm text-muted-foreground'>
                            {eventLabel(event)}
                          </p>
                        </div>
                        {event.eventType === 'idle' ? (
                          <PauseCircle className='h-4 w-4 shrink-0 text-muted-foreground' />
                        ) : (
                          <Clock className='h-4 w-4 shrink-0 text-muted-foreground' />
                        )}
                      </div>
                      <p className='mt-2 text-xs text-muted-foreground'>
                        {formatTimeRange(event.startedAt, event.endedAt)} ·{' '}
                        {formatDurationShort(event.durationSeconds)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

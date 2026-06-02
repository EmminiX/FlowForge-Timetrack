import { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Square, Coffee, AlertTriangle } from 'lucide-react';
import { useTimerWithEffects } from '../../hooks/useTimerWithEffects';
import { useTimerStore } from '../../stores/timerStore';
import { projectService, timeEntryService } from '../../services';
import type { Project } from '../../types';
import { formatDuration } from '../../types';
import { Button, Select, Card } from '../../components/ui';
import { playBreakSound, playWorkResumeSound } from '../../lib/sounds';
import { useSettings } from '../../contexts/SettingsContext';
import { useToastStore } from '../../stores/toastStore';
import clsx from 'clsx';
import { timeEntryLogger } from '../../lib/logger';
import { safeEmit, safeListen } from '../../lib/tauriRuntime';

export function TimerView() {
  const {
    state: timerState,
    projectId,
    projectName,
    projectColor,
    start,
    pause,
    resume,
    atomicStop,
    getElapsedSeconds,
  } = useTimerWithEffects();

  const { settings } = useSettings();
  const addToast = useToastStore((state) => state.addToast);
  const undoStop = useTimerStore((state) => state.undoStop);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [saving, setSaving] = useState(false);

  // Pomodoro state
  const [breakNotified, setBreakNotified] = useState(false);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakSecondsRemaining, setBreakSecondsRemaining] = useState(0);
  const [lastBreakTime, setLastBreakTime] = useState(0);

  // Idle state
  const [isIdlePaused, setIsIdlePaused] = useState(false);

  // Load active projects
  useEffect(() => {
    projectService
      .getActive()
      .then(setProjects)
      .catch((err) => timeEntryLogger.error('Failed to load active projects:', err));
  }, []);

  // Update elapsed time every second when running
  useEffect(() => {
    if (timerState === 'idle') {
      // Use timeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setElapsedSeconds(0);
        setBreakNotified(false);
        setShowBreakReminder(false);
        setIsOnBreak(false);
        setLastBreakTime(0);
      }, 0);
      return () => clearTimeout(timer);
    }

    const updateElapsed = () => {
      setElapsedSeconds(getElapsedSeconds());
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [timerState, getElapsedSeconds]);

  // Pomodoro break reminder check
  useEffect(() => {
    if (!settings?.pomodoroEnabled || timerState !== 'running' || breakNotified) return;

    const workSeconds = (settings.pomodoroWorkMinutes || 25) * 60;

    if (elapsedSeconds - lastBreakTime >= workSeconds) {
      // Use timeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setBreakNotified(true);
        setShowBreakReminder(true);

        if (settings.enableSoundFeedback) {
          playBreakSound();
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [elapsedSeconds, settings, timerState, breakNotified, lastBreakTime]);

  // Break countdown timer
  useEffect(() => {
    if (!isOnBreak || breakSecondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setBreakSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Break ended!
          if (settings?.enableSoundFeedback) {
            playWorkResumeSound();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOnBreak, breakSecondsRemaining, settings]);

  // Emit break status to widget
  useEffect(() => {
    safeEmit('timer-break-toggle', { active: showBreakReminder || isOnBreak }).catch((err) =>
      timeEntryLogger.error('Failed to emit break toggle:', err),
    );
  }, [showBreakReminder, isOnBreak]);

  // Listen for idle toggle events
  useEffect(() => {
    const unlisten = safeListen<{ active: boolean }>('timer-idle-toggle', (event) => {
      setIsIdlePaused(event.payload.active);
    });
    return () => {
      unlisten
        .then((f) => f())
        .catch(() => {
          /* Already unlistened */
        });
    };
  }, []);

  // Start break countdown
  const handleStartBreak = async () => {
    await pause(); // Pause the work timer
    const breakMinutes = settings?.pomodoroBreakMinutes || 5;
    setBreakSecondsRemaining(breakMinutes * 60);
    setIsOnBreak(true);
  };

  // Manual Resume after break
  const handleResumeWork = async () => {
    await resume();
    setIsOnBreak(false);
    setShowBreakReminder(false);
    setBreakNotified(false);
    setLastBreakTime(elapsedSeconds); // Reset cycle
  };

  // Sync selected project with running timer
  useEffect(() => {
    if (projectId) {
      // Use timeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setSelectedProjectId(projectId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [projectId]);

  const projectOptions = useMemo(() => {
    return projects.map((p) => ({
      value: p.id,
      label: p.name,
    }));
  }, [projects]);

  const handleStart = async () => {
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    await start(project.id, project.name, project.color);
  };

  const handlePause = async () => {
    await pause();
  };

  const handleResume = async () => {
    await resume();
  };

  const handleStop = async () => {
    setSaving(true);
    try {
      const stopped = await atomicStop(async (interval) => {
        const entryData = {
          projectId: interval.projectId,
          startTime: interval.startTime,
          endTime: new Date().toISOString(),
          pauseDuration: interval.pauseDuration,
          notes: '',
          isBillable: true,
          isBilled: false,
        };
        timeEntryLogger.debug('Creating time entry with data:', entryData);
        const entry = await timeEntryService.create(entryData);
        // emit is informational only -- don't let event-bus failures cause a
        // persistence rollback when the DB row already exists
        safeEmit('time-entry-saved').catch((err) => {
          timeEntryLogger.warn('Failed to emit time-entry-saved', { err });
        });
        return entry.id;
      });

      if (stopped) {
        addToast({
          message: 'Timer stopped',
          action: {
            label: 'Undo',
            onClick: async () => {
              const undone = await undoStop();
              if (!undone) {
                addToast({
                  message: 'Failed to undo timer. Delete the saved entry from Time Entries.',
                });
              }
            },
          },
          duration: 10000,
        });
      }
    } catch (err) {
      timeEntryLogger.error('Failed to save time entry', err);
      addToast({
        message: 'Failed to save time entry. Timer is still running; try stopping again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const statusColors = {
    idle: 'text-muted-foreground',
    running: 'text-[var(--accent-green)]',
    paused: 'text-[var(--accent-amber)]',
  };

  const statusLabels = {
    idle: 'Ready',
    running: 'Tracking',
    paused: 'Paused',
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-foreground'>Timer</h1>
      </div>

      {/* Idle Warning Banner */}
      {isIdlePaused && (
        <div className='rounded-lg border border-accent/40 bg-accent/15 p-4 animate-pulse'>
          <div className='flex items-center gap-3'>
            <AlertTriangle className='w-6 h-6 text-accent' />
            <div>
              <p className='font-medium text-accent'>Idle pause active</p>
              <p className='text-sm text-muted-foreground'>
                You've been away. The timer has been automatically paused.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Break Reminder Banner */}
      {showBreakReminder && (
        <div className='rounded-lg border border-accent/40 bg-accent/15 p-4'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-3'>
              <Coffee className='w-6 h-6 text-accent' />
              <div>
                {isOnBreak ? (
                  <>
                    <p className='font-medium text-accent'>
                      {breakSecondsRemaining === 0 ? 'Break Finished!' : 'On Break'}
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      {breakSecondsRemaining === 0 ? (
                        'Ready to resume working?'
                      ) : (
                        <span>
                          Time remaining:{' '}
                          <span className='font-mono font-medium'>
                            {formatDuration(breakSecondsRemaining)}
                          </span>
                        </span>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <p className='font-medium text-accent'>Time for a break!</p>
                    <p className='text-sm text-muted-foreground'>
                      You've been working for {settings?.pomodoroWorkMinutes || 25} minutes. Take a{' '}
                      {settings?.pomodoroBreakMinutes || 5} minute break.
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              {isOnBreak ? (
                <Button
                  variant='primary'
                  size='sm'
                  onClick={breakSecondsRemaining === 0 ? handleResumeWork : undefined}
                  disabled={breakSecondsRemaining > 0}
                  className={breakSecondsRemaining > 0 ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  Resume Work
                </Button>
              ) : (
                <Button variant='primary' size='sm' onClick={handleStartBreak}>
                  Start Break
                </Button>
              )}
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setShowBreakReminder(false);
                  setIsOnBreak(false);
                  setBreakNotified(false);
                  setLastBreakTime(elapsedSeconds); // Reset cycle on dismiss
                }}
              >
                {isOnBreak ? 'Skip Break' : 'Dismiss'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className='mx-auto max-w-4xl p-6 text-center lg:p-8'>
        {/* Status indicator */}
        <div className='flex items-center justify-center gap-2 mb-6'>
          <div
            className={clsx(
              'h-3 w-3 rounded-full',
              timerState === 'idle' && 'bg-muted-foreground',
              timerState === 'running' && 'bg-[var(--accent-green)] animate-pulse',
              timerState === 'paused' && 'bg-[var(--accent-amber)]',
            )}
            aria-hidden='true'
          />
          <span className={clsx('text-sm font-medium', statusColors[timerState])}>
            {statusLabels[timerState]}
          </span>
        </div>

        {/* Time display */}
        <div
          className={clsx(
            'mb-8 font-mono text-5xl font-light tracking-wider text-foreground sm:text-6xl',
            isIdlePaused && 'animate-flicker-timer',
          )}
          aria-live='polite'
          style={{
            color: isIdlePaused
              ? 'var(--accent-amber)'
              : timerState !== 'idle' && projectColor
                ? projectColor
                : undefined,
          }}
        >
          {formatDuration(elapsedSeconds)}
        </div>

        {/* Project info or selector */}
        {timerState !== 'idle' ? (
          <div className='mb-8'>
            <div className='flex items-center justify-center gap-2'>
              <div
                className='w-3 h-3 rounded-full'
                style={{ backgroundColor: projectColor || '#007AFF' }}
              />
              <span className='text-lg font-medium text-foreground'>{projectName}</span>
            </div>
          </div>
        ) : (
          <div className='max-w-sm mx-auto mb-8'>
            <Select
              label='Project'
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              options={projectOptions}
              placeholder='Select a project...'
            />
          </div>
        )}

        {/* Controls */}
        <div className='flex items-center justify-center gap-4'>
          {timerState === 'idle' && (
            <Button
              size='lg'
              onClick={handleStart}
              disabled={!selectedProjectId || projects.length === 0}
              className='gap-2 px-8'
            >
              <Play className='w-5 h-5' />
              Start
            </Button>
          )}

          {timerState === 'running' && (
            <>
              <Button size='lg' variant='secondary' onClick={handlePause} className='gap-2'>
                <Pause className='w-5 h-5' />
                Pause
              </Button>
              <Button
                size='lg'
                variant='destructive'
                onClick={handleStop}
                loading={saving}
                className='gap-2'
              >
                <Square className='w-5 h-5' />
                Stop
              </Button>
            </>
          )}

          {timerState === 'paused' && (
            <>
              <Button size='lg' onClick={handleResume} className='gap-2'>
                <Play className='w-5 h-5' />
                Resume
              </Button>
              <Button
                size='lg'
                variant='destructive'
                onClick={handleStop}
                loading={saving}
                className='gap-2'
              >
                <Square className='w-5 h-5' />
                Stop
              </Button>
            </>
          )}
        </div>

        {/* No projects hint */}
        {projects.length === 0 && timerState === 'idle' && (
          <p className='mt-6 text-sm text-muted-foreground'>
            Create a project first to start tracking time.
          </p>
        )}
      </Card>

      {/* Quick stats could go here */}
    </div>
  );
}

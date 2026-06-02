// Component to handle synchronization between main window timer and floating widget
import { useEffect } from 'react';
import { useTimerStore } from '../../stores/timerStore';
import { useTimerWithEffects } from '../../hooks/useTimerWithEffects';
import { timeEntryService } from '../../services';
import { uiLogger } from '../../lib/logger';
import { safeEmit, safeListen } from '../../lib/tauriRuntime';

export function TimerSync() {
  const { state, projectId, projectName, projectColor, getElapsedSeconds } = useTimerStore();
  const { pause, resume, atomicStop } = useTimerWithEffects();

  // Emit state updates to widget
  useEffect(() => {
    const syncState = () => {
      safeEmit('timer-sync', {
        status: state,
        projectId,
        projectName,
        projectColor,
        elapsedSeconds: getElapsedSeconds(),
      }).catch((err) => uiLogger.error('Failed to emit timer sync:', err));
    };

    // Sync immediately on change
    syncState();

    // Sync periodically while running to keep time updated
    let interval: ReturnType<typeof setInterval> | null = null;
    if (state === 'running') {
      interval = setInterval(syncState, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state, projectId, projectName, projectColor, getElapsedSeconds]);

  // Listen for commands from widget
  useEffect(() => {
    const unlistenCommand = safeListen<{ action: string }>('timer-command', async (event) => {
      const { action } = event.payload;

      uiLogger.debug('Received command:', action);

      if (action === 'pause') {
        pause();
      } else if (action === 'resume') {
        resume();
      } else if (action === 'stop') {
        try {
          const stopped = await atomicStop(async (interval) => {
            const entry = await timeEntryService.create({
              projectId: interval.projectId,
              startTime: interval.startTime,
              endTime: new Date().toISOString(),
              pauseDuration: interval.pauseDuration,
              notes: '',
              isBillable: true,
              isBilled: false,
            });
            // emit is informational only -- don't let event-bus failures cause a
            // persistence rollback when the DB row already exists
            safeEmit('time-entry-saved').catch((err) => {
              console.warn('Failed to emit time-entry-saved:', err);
            });
            return entry.id;
          });
          if (stopped) {
            uiLogger.debug('Saved time entry from widget stop');
          }
        } catch (err) {
          uiLogger.error('Failed to save time entry from widget:', err);
        }
      }
    });

    const unlistenRequest = safeListen('timer-request-sync', () => {
      safeEmit('timer-sync', {
        status: state,
        projectId,
        projectName,
        projectColor,
        elapsedSeconds: getElapsedSeconds(),
      }).catch((err) => uiLogger.error('Failed to emit timer sync:', err));
    });

    return () => {
      unlistenCommand
        .then((f) => f())
        .catch(() => {
          /* Already unlistened */
        });
      unlistenRequest
        .then((f) => f())
        .catch(() => {
          /* Already unlistened */
        });
    };
  }, [state, projectId, projectName, projectColor, getElapsedSeconds, pause, resume, atomicStop]);

  return null; // Headless component
}

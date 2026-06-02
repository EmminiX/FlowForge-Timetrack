// Floating Timer Widget
// A compact, always-on-top timer display

import { useEffect, useState } from 'react';
import { Play, Pause, Square, GripVertical, Layout } from 'lucide-react';
import { formatDuration } from '../types';
import { isTauriRuntime } from '../lib/platform';
import { safeEmit, safeListen } from '../lib/tauriRuntime';

interface TimerSyncState {
  status: 'idle' | 'running' | 'paused';
  projectId: string | null;
  projectName: string;
  projectColor: string;
  elapsedSeconds: number;
}

export function Widget() {
  const [timerState, setTimerState] = useState<TimerSyncState>({
    status: 'idle',
    projectId: null,
    projectName: '',
    projectColor: '',
    elapsedSeconds: 0,
  });
  const [isBreakActive, setIsBreakActive] = useState(false);
  const [isIdlePaused, setIsIdlePaused] = useState(false);

  // Listen for state updates
  useEffect(() => {
    // Reset document margins/padding just in case
    document.documentElement.style.margin = '0';
    document.body.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.body.style.padding = '0';
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const unlisten = safeListen<TimerSyncState>('timer-sync', (event) => {
      setTimerState(event.payload);
    });

    const unlistenBreak = safeListen<{ active: boolean }>('timer-break-toggle', (event) => {
      setIsBreakActive(event.payload.active);
    });

    const unlistenIdle = safeListen<{ active: boolean }>('timer-idle-toggle', (event) => {
      setIsIdlePaused(event.payload.active);
    });

    safeEmit('timer-request-sync');

    return () => {
      unlisten
        .then((f) => f())
        .catch(() => {
          /* Already unlistened */
        });
      unlistenBreak
        .then((f) => f())
        .catch(() => {
          /* Already unlistened */
        });
      unlistenIdle
        .then((f) => f())
        .catch(() => {
          /* Already unlistened */
        });
      // Optional: reset background on unmount if needed, but for a dedicated window it's fine
    };
  }, []);

  // Handle window dragging
  const handleDrag = async (e: React.MouseEvent) => {
    if (e.button === 0 && isTauriRuntime()) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().startDragging();
    }
  };

  const handlePauseResume = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timerState.status === 'running') {
      await safeEmit('timer-command', { action: 'pause' });
    } else if (timerState.status === 'paused') {
      await safeEmit('timer-command', { action: 'resume' });
    }
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await safeEmit('timer-command', { action: 'stop' });
  };

  // Determine if we should show flashing (break or idle while running)
  const shouldFlash = isBreakActive || isIdlePaused;
  const flashColor = 'var(--accent-amber)';

  // Use muted styling for idle state
  const isIdle = timerState.status === 'idle';
  const displayColor = isIdle
    ? 'var(--muted-foreground)'
    : shouldFlash
      ? flashColor
      : timerState.projectColor || 'var(--primary)';
  const pauseResumeLabel = isIdle
    ? 'Pause or resume timer unavailable'
    : timerState.status === 'running'
      ? 'Pause timer'
      : 'Resume timer';
  const stopLabel = isIdle ? 'Stop timer unavailable' : 'Stop timer';

  return (
    <div
      className={`widget-container ${shouldFlash ? 'animate-flicker' : ''}`}
      style={{
        borderColor: displayColor,
        boxShadow: isIdle
          ? 'none'
          : shouldFlash
            ? '0 0 0 2px color-mix(in oklch, var(--accent-amber) 20%, transparent)'
            : 'var(--shadow-card)',
      }}
      onMouseDown={handleDrag}
      role='group'
      aria-label={`Timer widget: ${isIdle ? 'ready' : `${timerState.status}, ${formatDuration(timerState.elapsedSeconds)}`}`}
    >
      {/* Drag Handle */}
      <div className='widget-drag-handle' title='Drag to move'>
        <GripVertical className='w-4 h-4 text-muted-foreground/40' />
      </div>

      {/* Timer display */}
      <div className='widget-content' style={{ pointerEvents: 'none' }}>
        <span className='widget-time' style={{ color: displayColor }} aria-live='polite'>
          {formatDuration(timerState.elapsedSeconds)}
        </span>
        <span className='widget-project'>
          {isIdle
            ? 'Ready'
            : isIdlePaused
              ? 'IDLE'
              : isBreakActive
                ? 'Take a Break!'
                : timerState.projectName}
        </span>
      </div>

      {/* Controls */}
      <div className='widget-controls'>
        <button
          className='widget-button'
          onMouseUp={(e) => {
            e.stopPropagation();
            handlePauseResume(e);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title={pauseResumeLabel}
          aria-label={pauseResumeLabel}
          disabled={timerState.status === 'idle'}
        >
          {timerState.status === 'running' ? (
            <Pause className='w-3.5 h-3.5' />
          ) : (
            <Play className='w-3.5 h-3.5 ml-0.5' />
          )}
        </button>
        <button
          className='widget-button'
          onMouseUp={async (e) => {
            e.stopPropagation();
            if (!isTauriRuntime()) return;
            // Get the main window and unminimize/focus it
            const { Window } = await import('@tauri-apps/api/window');
            const mainWindow = new Window('main');
            await mainWindow.unminimize();
            await mainWindow.show();
            await mainWindow.setFocus();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title='Open App'
          aria-label='Open TimeSage'
        >
          <Layout className='w-3.5 h-3.5' />
        </button>
        <button
          className='widget-button widget-button-stop'
          onMouseUp={(e) => {
            e.stopPropagation();
            handleStop(e);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title={stopLabel}
          aria-label={stopLabel}
          disabled={timerState.status === 'idle'}
        >
          <Square className='w-3.5 h-3.5' />
        </button>
      </div>
    </div>
  );
}

export default Widget;

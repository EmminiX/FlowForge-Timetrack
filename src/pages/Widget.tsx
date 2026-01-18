// Floating Timer Widget
// A compact, always-on-top timer display

import { useEffect, useState } from 'react';
import { Play, Pause, Square, GripVertical, Layout } from 'lucide-react';
import { listen, emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { formatDuration } from '../types';

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
        elapsedSeconds: 0
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

        const unlisten = listen<TimerSyncState>('timer-sync', (event) => {
            setTimerState(event.payload);
        });

        const unlistenBreak = listen<{ active: boolean }>('timer-break-toggle', (event) => {
            setIsBreakActive(event.payload.active);
        });

        const unlistenIdle = listen<{ active: boolean }>('timer-idle-toggle', (event) => {
            setIsIdlePaused(event.payload.active);
        });

        emit('timer-request-sync');

        return () => {
            unlisten.then(f => f());
            unlistenBreak.then(f => f());
            unlistenIdle.then(f => f());
            // Optional: reset background on unmount if needed, but for a dedicated window it's fine
        };
    }, []);

    // Handle window dragging
    const handleDrag = async (e: React.MouseEvent) => {
        if (e.button === 0) {
            await getCurrentWindow().startDragging();
        }
    };

    const handlePauseResume = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (timerState.status === 'running') {
            await emit('timer-command', { action: 'pause' });
        } else if (timerState.status === 'paused') {
            await emit('timer-command', { action: 'resume' });
        }
    };

    const handleStop = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await emit('timer-command', { action: 'stop' });
    };

    // If not tracking
    if (timerState.status === 'idle') {
        return (
            <div className="widget-container widget-idle" onMouseDown={handleDrag}>
                <span className="widget-idle-text" style={{ pointerEvents: 'none' }}>No timer</span>
            </div>
        );
    }

    // Determine if we should show flashing (break or idle)
    const shouldFlash = isBreakActive || isIdlePaused;
    const flashColor = '#f97316'; // orange-500

    return (
        <div
            className={`widget-container ${shouldFlash ? 'animate-flicker' : ''}`}
            style={{
                borderColor: shouldFlash ? flashColor : (timerState.projectColor || '#007AFF'),
                boxShadow: shouldFlash
                    ? '0 0 12px rgba(249, 115, 22, 0.5)'
                    : `0 0 12px ${timerState.projectColor}15`
            }}
            onMouseDown={handleDrag}
        >
            {/* Drag Handle */}
            <div className="widget-drag-handle" title="Drag to move">
                <GripVertical className="w-4 h-4 text-muted-foreground/40" />
            </div>

            {/* Timer display */}
            <div className="widget-content" style={{ pointerEvents: 'none' }}>
                <span
                    className="widget-time"
                    style={{ color: shouldFlash ? flashColor : (timerState.projectColor || '#007AFF') }}
                >
                    {formatDuration(timerState.elapsedSeconds)}
                </span>
                <span className="widget-project">
                    {isIdlePaused ? 'IDLE' : isBreakActive ? 'Take a Break!' : timerState.projectName}
                </span>
            </div>

            {/* Controls */}
            <div className="widget-controls">
                <button
                    className="widget-button"
                    onMouseUp={(e) => {
                        e.stopPropagation();
                        handlePauseResume(e);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title={timerState.status === 'running' ? 'Pause' : 'Resume'}
                >
                    {timerState.status === 'running' ? (
                        <Pause className="w-3.5 h-3.5" />
                    ) : (
                        <Play className="w-3.5 h-3.5 ml-0.5" />
                    )}
                </button>
                <button
                    className="widget-button"
                    onMouseUp={async (e) => {
                        e.stopPropagation();
                        // Get the main window and unminimize/focus it
                        const { Window } = await import('@tauri-apps/api/window');
                        const mainWindow = new Window('main');
                        await mainWindow.unminimize();
                        await mainWindow.show();
                        await mainWindow.setFocus();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Open App"
                >
                    <Layout className="w-3.5 h-3.5" />
                </button>
                <button
                    className="widget-button widget-button-stop"
                    onMouseUp={(e) => {
                        e.stopPropagation();
                        handleStop(e);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Stop"
                >
                    <Square className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

export default Widget;

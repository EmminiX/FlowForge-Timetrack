// Component to handle synchronization between main window timer and floating widget
import { useEffect } from 'react';
import { useTimerStore } from '../../stores/timerStore';
import { useTimerWithEffects } from '../../hooks/useTimerWithEffects';
import { listen, emit } from '@tauri-apps/api/event';

export function TimerSync() {
    const { state, projectId, projectName, projectColor, getElapsedSeconds } = useTimerStore();
    const { pause, resume, stop } = useTimerWithEffects();

    // Emit state updates to widget
    useEffect(() => {
        const syncState = () => {
            emit('timer-sync', {
                status: state,
                projectId,
                projectName,
                projectColor,
                elapsedSeconds: getElapsedSeconds()
            }).catch(console.error);
        };

        // Sync immediately on change
        syncState();

        // Sync periodically while running to keep time updated
        let interval: NodeJS.Timeout | null = null;
        if (state === 'running') {
            interval = setInterval(syncState, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [state, projectId, projectName, projectColor, getElapsedSeconds]);

    // Listen for commands from widget
    useEffect(() => {
        const unlistenCommand = listen('timer-command', (event: any) => {
            const { action } = event.payload;

            console.log('[TimerSync] Received command:', action);

            if (action === 'pause') {
                pause();
            } else if (action === 'resume') {
                resume();
            } else if (action === 'stop') {
                stop();
            }
        });

        const unlistenRequest = listen('timer-request-sync', () => {
            emit('timer-sync', {
                status: state,
                projectId,
                projectName,
                projectColor,
                elapsedSeconds: getElapsedSeconds()
            }).catch(console.error);
        });

        return () => {
            unlistenCommand.then(f => f());
            unlistenRequest.then(f => f());
        };
    }, [state, projectId, projectName, projectColor, getElapsedSeconds, pause, resume, stop]);

    return null; // Headless component
}

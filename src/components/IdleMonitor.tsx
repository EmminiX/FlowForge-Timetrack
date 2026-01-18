import { useEffect, useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTimerStore } from '../stores/timerStore';
import { useSettings } from '../contexts/SettingsContext';
import { IdleDialog } from './IdleDialog';

const POLL_INTERVAL = 5000; // Check every 5 seconds for responsiveness
const DEFAULT_IDLE_THRESHOLD = 300; // 5 minutes in seconds
const MIN_ACTIVE_TIME = 10; // User is considered "back" if idle < 10 seconds

export function IdleMonitor() {
    const timerState = useTimerStore(state => state.state);
    const timerPause = useTimerStore(state => state.pause);
    const { settings } = useSettings();

    const [showDialog, setShowDialog] = useState(false);
    const [idleDuration, setIdleDuration] = useState(0);
    const idleStartRef = useRef<Date | null>(null);
    const wasRunningRef = useRef(false);
    const pausedByIdleRef = useRef(false);

    const idleThreshold = settings.idleThresholdMinutes
        ? settings.idleThresholdMinutes * 60
        : DEFAULT_IDLE_THRESHOLD;

    const checkIdle = useCallback(async () => {
        // Skip if idle detection is disabled
        if (!settings.enableIdleDetection) return;

        // Optimize: Only check if running OR if we are waiting for user to return from auto-pause
        if (timerState !== 'running' && !pausedByIdleRef.current) {
            return;
        }

        try {
            const idleSeconds = await invoke<number>('get_idle_time');
            // console.log(`[IdleMonitor] Idle: ${idleSeconds}s`); // Uncomment for verbose debugging

            // User is idle and timer is running - pause it
            if (idleSeconds >= idleThreshold && timerState === 'running' && !pausedByIdleRef.current) {
                console.log(`[IdleMonitor] Pausing timer (idle ${idleSeconds}s)`);
                idleStartRef.current = new Date(Date.now() - idleSeconds * 1000);
                wasRunningRef.current = true;
                pausedByIdleRef.current = true;
                timerPause();
            }

            // User returned from being idle - show dialog
            if (idleSeconds < MIN_ACTIVE_TIME && pausedByIdleRef.current && idleStartRef.current) {
                console.log('[IdleMonitor] User returned. Showing dialog.');
                const totalIdleMs = Date.now() - idleStartRef.current.getTime();
                const totalIdleSeconds = Math.round(totalIdleMs / 1000);

                // Only show dialog if they were actually idle for a significant time
                if (totalIdleSeconds >= idleThreshold) {
                    setIdleDuration(totalIdleSeconds);
                    setShowDialog(true);
                    // Reset flags so we don't block future checks
                    pausedByIdleRef.current = false;
                    wasRunningRef.current = false;
                } else {
                    console.log('[IdleMonitor] Idle duration too short for dialog:', totalIdleSeconds);
                    // Reset flags anyway
                    pausedByIdleRef.current = false;
                    wasRunningRef.current = false;
                }
            }
        } catch (error) {
            console.error('[IdleMonitor] Failed to check idle time:', error);
        }
    }, [timerState, timerPause, settings.enableIdleDetection, idleThreshold]);

    useEffect(() => {
        const interval = setInterval(checkIdle, POLL_INTERVAL);
        checkIdle(); // Also check immediately

        return () => clearInterval(interval);
    }, [checkIdle]);

    // Reset state when timer state changes externally
    useEffect(() => {
        if (timerState === 'idle') {
            pausedByIdleRef.current = false;
            wasRunningRef.current = false;
            idleStartRef.current = null;
        }
    }, [timerState]);

    if (!showDialog) return null;

    return (
        <IdleDialog
            idleDuration={idleDuration}
            onClose={() => {
                setShowDialog(false);
                idleStartRef.current = null;
            }}
        />
    );
}

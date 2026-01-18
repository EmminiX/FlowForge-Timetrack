// Hook that wraps timer store with sound and notification effects
// This provides the timer actions with feedback based on user settings

import { useCallback } from 'react';
import { useTimerStore } from '../stores/timerStore';
import { settingsService } from '../services';
import { playStartSound, playPauseSound, playResumeSound, playStopSound } from '../lib/sounds';
import { notifyTimerStarted, notifyTimerStopped } from '../lib/notifications';
import { formatDuration } from '../types';

export function useTimerWithEffects() {
    const timerStore = useTimerStore();

    const start = useCallback(async (projectId: string, projectName: string, projectColor: string) => {
        const settings = await settingsService.load();

        timerStore.start(projectId, projectName, projectColor);

        if (settings.enableSoundFeedback) {
            playStartSound();
        }

        if (settings.enableNotifications) {
            notifyTimerStarted(projectName).catch(console.warn);
        }
    }, [timerStore]);

    const pause = useCallback(async () => {
        const settings = await settingsService.load();

        timerStore.pause();

        if (settings.enableSoundFeedback) {
            playPauseSound();
        }
    }, [timerStore]);

    const resume = useCallback(async () => {
        const settings = await settingsService.load();

        timerStore.resume();

        if (settings.enableSoundFeedback) {
            playResumeSound();
        }
    }, [timerStore]);

    const stop = useCallback(async () => {
        const settings = await settingsService.load();
        const projectName = timerStore.projectName;
        const elapsedSeconds = timerStore.getElapsedSeconds();

        const result = timerStore.stop();

        if (settings.enableSoundFeedback) {
            playStopSound();
        }

        if (settings.enableNotifications && projectName) {
            notifyTimerStopped(projectName, formatDuration(elapsedSeconds)).catch(console.warn);
        }

        return result;
    }, [timerStore]);

    return {
        // State from store
        state: timerStore.state,
        projectId: timerStore.projectId,
        projectName: timerStore.projectName,
        projectColor: timerStore.projectColor,
        startTime: timerStore.startTime,
        getElapsedSeconds: timerStore.getElapsedSeconds,
        getPauseDuration: timerStore.getPauseDuration,
        reset: timerStore.reset,

        // Enhanced actions with effects
        start,
        pause,
        resume,
        stop,
    };
}

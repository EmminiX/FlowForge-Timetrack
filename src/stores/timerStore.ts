// Timer store with Zustand for managing timer state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TimerState = 'idle' | 'running' | 'paused';

interface LastStoppedState {
  projectId: string;
  projectName: string;
  projectColor: string;
  startTime: string;
  accumulatedPauseDuration: number;
}

interface TimerStore {
  // State
  state: TimerState;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
  startTime: string | null; // ISO string
  pauseStartTime: string | null; // When current pause started
  accumulatedPauseDuration: number; // Total pause time in seconds
  lastStoppedState: LastStoppedState | null;

  // Actions
  start: (projectId: string, projectName: string, projectColor: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => { projectId: string; startTime: string; pauseDuration: number } | null;
  reset: () => void;
  undoStop: () => boolean;
  clearLastStopped: () => void;

  // Computed (not stored, but helper)
  getElapsedSeconds: () => number;
  getPauseDuration: () => number;
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      state: 'idle',
      projectId: null,
      projectName: null,
      projectColor: null,
      startTime: null,
      pauseStartTime: null,
      accumulatedPauseDuration: 0,
      lastStoppedState: null,

      start: (projectId, projectName, projectColor) => {
        set({
          state: 'running',
          projectId,
          projectName,
          projectColor,
          startTime: new Date().toISOString(),
          pauseStartTime: null,
          accumulatedPauseDuration: 0,
          lastStoppedState: null,
        });
      },

      pause: () => {
        const { state } = get();
        if (state !== 'running') return;

        set({
          state: 'paused',
          pauseStartTime: new Date().toISOString(),
        });
      },

      resume: () => {
        const { state, pauseStartTime, accumulatedPauseDuration } = get();
        if (state !== 'paused' || !pauseStartTime) return;

        const pauseEnd = Date.now();
        const pauseStart = new Date(pauseStartTime).getTime();
        const pauseSeconds = (pauseEnd - pauseStart) / 1000;

        set({
          state: 'running',
          pauseStartTime: null,
          accumulatedPauseDuration: accumulatedPauseDuration + pauseSeconds,
        });
      },

      stop: () => {
        const { state, projectId, projectName, projectColor, startTime, pauseStartTime, accumulatedPauseDuration } = get();
        if (state === 'idle' || !projectId || !startTime) return null;

        // Calculate final pause duration
        let totalPauseDuration = accumulatedPauseDuration;
        if (state === 'paused' && pauseStartTime) {
          const pauseEnd = Date.now();
          const pauseStart = new Date(pauseStartTime).getTime();
          totalPauseDuration += (pauseEnd - pauseStart) / 1000;
        }

        const result = {
          projectId,
          startTime,
          pauseDuration: Math.round(totalPauseDuration),
        };

        set({
          lastStoppedState: {
            projectId: projectId!,
            projectName: projectName!,
            projectColor: projectColor!,
            startTime: startTime!,
            accumulatedPauseDuration,
          },
          state: 'idle',
          projectId: null,
          projectName: null,
          projectColor: null,
          startTime: null,
          pauseStartTime: null,
          accumulatedPauseDuration: 0,
        });

        return result;
      },

      reset: () => {
        set({
          state: 'idle',
          projectId: null,
          projectName: null,
          projectColor: null,
          startTime: null,
          pauseStartTime: null,
          accumulatedPauseDuration: 0,
          lastStoppedState: null,
        });
      },

      undoStop: () => {
        const { lastStoppedState } = get();
        if (!lastStoppedState) return false;

        set({
          state: 'running',
          projectId: lastStoppedState.projectId,
          projectName: lastStoppedState.projectName,
          projectColor: lastStoppedState.projectColor,
          startTime: lastStoppedState.startTime,
          pauseStartTime: null,
          accumulatedPauseDuration: lastStoppedState.accumulatedPauseDuration,
          lastStoppedState: null,
        });

        return true;
      },

      clearLastStopped: () => {
        set({ lastStoppedState: null });
      },

      getElapsedSeconds: () => {
        const { state, startTime, pauseStartTime, accumulatedPauseDuration } = get();

        if (state === 'idle' || !startTime) return 0;

        const now = Date.now();
        const start = new Date(startTime).getTime();
        let elapsed = (now - start) / 1000;

        // Subtract accumulated pause time
        elapsed -= accumulatedPauseDuration;

        // If currently paused, subtract current pause duration
        if (state === 'paused' && pauseStartTime) {
          const currentPause = (now - new Date(pauseStartTime).getTime()) / 1000;
          elapsed -= currentPause;
        }

        return Math.max(0, elapsed);
      },

      getPauseDuration: () => {
        const { state, pauseStartTime, accumulatedPauseDuration } = get();

        let total = accumulatedPauseDuration;

        if (state === 'paused' && pauseStartTime) {
          const currentPause = (Date.now() - new Date(pauseStartTime).getTime()) / 1000;
          total += currentPause;
        }

        return total;
      },
    }),
    {
      name: 'flowforge-timer',
      // Only persist essential state for crash recovery
      partialize: (state) => ({
        state: state.state,
        projectId: state.projectId,
        projectName: state.projectName,
        projectColor: state.projectColor,
        startTime: state.startTime,
        pauseStartTime: state.pauseStartTime,
        accumulatedPauseDuration: state.accumulatedPauseDuration,
        lastStoppedState: state.lastStoppedState,
      }),
    },
  ),
);

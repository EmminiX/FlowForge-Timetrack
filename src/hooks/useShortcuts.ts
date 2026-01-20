// Hook for handling global keyboard shortcuts
import { useEffect, useRef } from 'react';
import { shortcutService, ShortcutAction } from '../services/shortcutService';
import { useTimerStore } from '../stores/timerStore';
import { useSettings } from '../contexts/SettingsContext';
import { toggleWidget } from '../lib/widgetWindow';
import { isPermissionGranted, sendNotification } from '@tauri-apps/plugin-notification';
import { timeEntryService } from '../services';
import { emit } from '@tauri-apps/api/event';

export function useShortcuts() {
  const timerState = useTimerStore((state) => state.state);
  const timerPause = useTimerStore((state) => state.pause);
  const timerResume = useTimerStore((state) => state.resume);
  const timerStop = useTimerStore((state) => state.stop);
  const { settings, updateSetting } = useSettings();

  // Use refs to avoid stale closures
  const timerStateRef = useRef(timerState);
  const settingsRef = useRef(settings);

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const handleAction = async (action: ShortcutAction) => {
      const currentTimerState = timerStateRef.current;
      const currentSettings = settingsRef.current;

      switch (action) {
        case 'start':
          if (currentTimerState === 'paused') {
            timerResume();
            await showNotification('Timer Resumed', 'Your timer has been resumed');
          }
          // Note: Starting a new timer requires project selection, so we just resume
          break;

        case 'pause':
          if (currentTimerState === 'running') {
            timerPause();
            await showNotification('Timer Paused', 'Your timer has been paused');
          }
          break;

        case 'stop':
          if (currentTimerState !== 'idle') {
            const result = timerStop();
            if (result) {
              try {
                await timeEntryService.create({
                  projectId: result.projectId,
                  startTime: result.startTime,
                  endTime: new Date().toISOString(),
                  pauseDuration: result.pauseDuration,
                  notes: '',
                  isBillable: true,
                  isBilled: false,
                });
                await emit('time-entry-saved');
                await showNotification('Timer Stopped', 'Time entry has been saved');
              } catch (err) {
                console.error('Failed to save time entry via shortcut:', err);
                await showNotification('Error', 'Failed to save time entry');
              }
            }
          }
          break;

        case 'toggle-widget': {
          const newWidgetState = !currentSettings.showFloatingWidget;
          await toggleWidget(newWidgetState);
          await updateSetting('showFloatingWidget', newWidgetState);
          await showNotification(
            newWidgetState ? 'Widget Shown' : 'Widget Hidden',
            newWidgetState
              ? 'Floating timer widget is now visible'
              : 'Floating timer widget is now hidden',
          );
          break;
        }

        case 'toggle-sound': {
          const newSoundState = !currentSettings.enableSoundFeedback;
          await updateSetting('enableSoundFeedback', newSoundState);
          await showNotification(
            newSoundState ? 'Sounds Enabled' : 'Sounds Disabled',
            newSoundState ? 'Sound feedback is now on' : 'Sound feedback is now off',
          );
          break;
        }
      }
    };

    let cleanup: (() => void) | null = null;

    shortcutService
      .subscribe(handleAction)
      .then((fn) => {
        cleanup = fn;
      })
      .catch((error) => {
        console.error('Failed to subscribe to shortcuts:', error);
      });

    return () => {
      cleanup?.();
    };
  }, [timerPause, timerResume, timerStop, updateSetting]);
}

async function showNotification(title: string, body: string) {
  try {
    const permitted = await isPermissionGranted();
    if (permitted) {
      sendNotification({ title, body });
    }
  } catch (error) {
    // Notifications not available, silently fail
    console.debug('Notification not sent:', error);
  }
}

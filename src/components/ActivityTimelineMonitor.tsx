import { useEffect, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { safeInvoke } from '../lib/tauriRuntime';
import { activityTimelineService } from '../services';

const POLL_INTERVAL_MS = 60_000;
const MIN_EVENT_SECONDS = 60;
const DEFAULT_IDLE_THRESHOLD_SECONDS = 300;
const ACTIVE_AGAIN_SECONDS = 10;

interface ActiveWindowSnapshot {
  appName: string;
  windowTitle: string | null;
}

interface OpenSample extends ActiveWindowSnapshot {
  startedAt: string;
}

function sameSample(a: ActiveWindowSnapshot, b: ActiveWindowSnapshot): boolean {
  return a.appName === b.appName && (a.windowTitle || null) === (b.windowTitle || null);
}

function sanitizeSnapshot(
  snapshot: ActiveWindowSnapshot,
  includeTitle: boolean,
): ActiveWindowSnapshot {
  return {
    appName: snapshot.appName || 'Unknown app',
    windowTitle: includeTitle ? snapshot.windowTitle || null : null,
  };
}

export function ActivityTimelineMonitor() {
  const { settings } = useSettings();
  const openSampleRef = useRef<OpenSample | null>(null);
  const idleStartRef = useRef<string | null>(null);
  const captureTitles = Boolean(settings.captureTimelineWindowTitles);
  const idleThresholdSeconds =
    (settings.idleThresholdMinutes || DEFAULT_IDLE_THRESHOLD_SECONDS / 60) * 60;

  useEffect(() => {
    if (!settings.enablePrivateTimeline) {
      openSampleRef.current = null;
      return;
    }

    let cancelled = false;

    const flushOpenSample = async (endedAt: string) => {
      const openSample = openSampleRef.current;
      if (!openSample) return;

      const durationSeconds = Math.round(
        (new Date(endedAt).getTime() - new Date(openSample.startedAt).getTime()) / 1000,
      );
      if (durationSeconds < MIN_EVENT_SECONDS) return;

      await activityTimelineService.recordEvent({
        eventType: 'activity',
        appName: openSample.appName,
        windowTitle: openSample.windowTitle,
        startedAt: openSample.startedAt,
        endedAt,
        source: 'system',
      });
    };

    const sample = async () => {
      const timestamp = new Date().toISOString();
      const idleSeconds = await safeInvoke<number>('get_idle_time');

      if (typeof idleSeconds === 'number') {
        if (idleSeconds >= idleThresholdSeconds && !idleStartRef.current) {
          idleStartRef.current = new Date(Date.now() - idleSeconds * 1000).toISOString();
        }

        if (idleSeconds < ACTIVE_AGAIN_SECONDS && idleStartRef.current) {
          await activityTimelineService.recordIdleGap({
            startedAt: idleStartRef.current,
            endedAt: timestamp,
          });
          idleStartRef.current = null;
        }
      }

      const rawSnapshot = await safeInvoke<ActiveWindowSnapshot>('get_active_window_snapshot', {
        includeTitle: captureTitles,
      });
      if (cancelled || !rawSnapshot) return;

      const snapshot = sanitizeSnapshot(rawSnapshot, captureTitles);
      const openSample = openSampleRef.current;

      if (!openSample) {
        openSampleRef.current = { ...snapshot, startedAt: timestamp };
        return;
      }

      if (sameSample(openSample, snapshot)) return;

      await flushOpenSample(timestamp);
      openSampleRef.current = { ...snapshot, startedAt: timestamp };
    };

    sample();
    const interval = window.setInterval(sample, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [settings.enablePrivateTimeline, captureTitles, idleThresholdSeconds]);

  return null;
}

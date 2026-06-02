import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityTimelineMonitor } from './ActivityTimelineMonitor';

const serviceMocks = vi.hoisted(() => ({
  recordEvent: vi.fn(),
  recordIdleGap: vi.fn(),
  safeInvoke: vi.fn(),
}));

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: {
      enablePrivateTimeline: true,
      captureTimelineWindowTitles: false,
      idleThresholdMinutes: 5,
    },
  }),
}));

vi.mock('../lib/tauriRuntime', () => ({
  safeInvoke: serviceMocks.safeInvoke,
}));

vi.mock('../services', () => ({
  activityTimelineService: {
    recordEvent: serviceMocks.recordEvent,
    recordIdleGap: serviceMocks.recordIdleGap,
  },
}));

describe('ActivityTimelineMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-02T09:00:00.000Z'));
    serviceMocks.recordEvent.mockReset();
    serviceMocks.recordIdleGap.mockReset();
    serviceMocks.safeInvoke.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces local app samples and strips window titles until title capture is enabled', async () => {
    const snapshots = [
      { appName: 'Figma', windowTitle: 'Design System Audit' },
      { appName: 'VS Code', windowTitle: 'FlowForge' },
    ];
    serviceMocks.safeInvoke.mockImplementation((command: string) => {
      if (command === 'get_idle_time') return Promise.resolve(0);
      return Promise.resolve(snapshots.shift() || snapshots[0]);
    });
    serviceMocks.recordEvent.mockResolvedValue({});

    render(<ActivityTimelineMonitor />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(serviceMocks.safeInvoke).toHaveBeenCalledWith('get_active_window_snapshot', {
      includeTitle: false,
    });

    await act(async () => {
      vi.setSystemTime(new Date('2026-06-02T09:09:00.000Z'));
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(serviceMocks.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'activity',
        appName: 'Figma',
        windowTitle: null,
        startedAt: '2026-06-02T09:00:00.000Z',
        endedAt: '2026-06-02T09:10:00.000Z',
      }),
    );
  });

  it('records an idle gap when local idle time crosses the threshold and activity returns', async () => {
    const idleTimes = [0, 360, 2];
    serviceMocks.safeInvoke.mockImplementation((command: string) => {
      if (command === 'get_idle_time') return Promise.resolve(idleTimes.shift() ?? 0);
      return Promise.resolve({ appName: 'Figma', windowTitle: 'Design System Audit' });
    });
    serviceMocks.recordIdleGap.mockResolvedValue({});

    render(<ActivityTimelineMonitor />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(serviceMocks.safeInvoke).toHaveBeenCalledWith('get_idle_time');

    await act(async () => {
      vi.setSystemTime(new Date('2026-06-02T09:09:00.000Z'));
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await act(async () => {
      vi.setSystemTime(new Date('2026-06-02T09:15:00.000Z'));
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(serviceMocks.recordIdleGap).toHaveBeenCalledWith(
      expect.objectContaining({
        startedAt: '2026-06-02T09:04:00.000Z',
        endedAt: '2026-06-02T09:16:00.000Z',
      }),
    );
  });
});

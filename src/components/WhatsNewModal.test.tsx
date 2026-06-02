import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WhatsNewModal } from './WhatsNewModal';

const settingsMock = vi.hoisted(() => ({
  loading: false,
  settings: {
    seenChangelogVersion: '0.2.0',
  },
  updateSetting: vi.fn(),
}));

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({
    loading: settingsMock.loading,
    settings: settingsMock.settings,
    updateSetting: settingsMock.updateSetting,
  }),
}));

vi.mock('../services/updateService', () => ({
  updateService: {
    getCurrentVersion: () => '0.2.1',
  },
}));

describe('WhatsNewModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    settingsMock.loading = false;
    settingsMock.settings.seenChangelogVersion = '0.2.0';
    settingsMock.updateSetting.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not reopen while dismissal persistence is still pending', async () => {
    let resolveUpdate!: () => void;
    settingsMock.updateSetting.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    render(<WhatsNewModal />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByRole('dialog', { name: /what's new in v0\.2\.1/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /got it/i }));

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    expect(settingsMock.updateSetting).toHaveBeenCalledWith('seenChangelogVersion', '0.2.1');
    expect(screen.queryByRole('dialog', { name: /what's new/i })).not.toBeInTheDocument();

    await act(async () => {
      resolveUpdate();
    });
  });
});

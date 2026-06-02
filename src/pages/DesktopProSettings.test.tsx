import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopProSettings } from './DesktopProSettings';

const mocks = vi.hoisted(() => ({
  updateSetting: vi.fn(),
  getAutostartEnabled: vi.fn(),
  setAutostart: vi.fn(),
  checkForUpdate: vi.fn(),
}));

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: {
      launchAtLogin: false,
      enableNativeUpdaterChecks: true,
    },
    updateSetting: mocks.updateSetting,
  }),
}));

vi.mock('../services/desktopProService', () => ({
  desktopProService: {
    getAutostartEnabled: mocks.getAutostartEnabled,
    setAutostart: mocks.setAutostart,
    checkForUpdate: mocks.checkForUpdate,
  },
}));

describe('DesktopProSettings', () => {
  beforeEach(() => {
    mocks.updateSetting.mockReset();
    mocks.getAutostartEnabled.mockResolvedValue({ supported: true, enabled: false });
    mocks.setAutostart.mockResolvedValue({ supported: true, enabled: true });
    mocks.checkForUpdate.mockResolvedValue({
      source: 'release-feed',
      status: 'none',
      currentVersion: '0.2.0',
      latestVersion: '0.2.0',
    });
  });

  it('shows desktop pro controls and syncs launch-at-login', async () => {
    render(<DesktopProSettings />);

    expect(screen.getByText('Desktop Pro Mode')).toBeInTheDocument();
    expect(screen.getByText('System tray controls')).toBeInTheDocument();
    expect(screen.getByText('Saved window position')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Launch at login' }));

    await waitFor(() => {
      expect(mocks.setAutostart).toHaveBeenCalledWith(true);
      expect(mocks.updateSetting).toHaveBeenCalledWith('launchAtLogin', true);
    });
  });

  it('checks for updater status from the settings panel', async () => {
    render(<DesktopProSettings />);

    fireEvent.click(screen.getByRole('button', { name: 'Check for updates' }));

    expect(await screen.findByText('No update available')).toBeInTheDocument();
    expect(mocks.checkForUpdate).toHaveBeenCalled();
  });
});

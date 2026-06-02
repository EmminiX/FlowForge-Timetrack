import { isTauriRuntime } from '../lib/platform';
import { updateService } from './updateService';

export interface DesktopProAutostartStatus {
  supported: boolean;
  enabled: boolean;
  error?: string;
}

export type DesktopProUpdateSource = 'native-updater' | 'release-feed';
export type DesktopProUpdateStatus = 'available' | 'none' | 'error';

export interface DesktopProUpdateResult {
  source: DesktopProUpdateSource;
  status: DesktopProUpdateStatus;
  currentVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  message?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Desktop feature is unavailable.';
}

async function checkReleaseFeed(message?: string): Promise<DesktopProUpdateResult> {
  const release = await updateService.checkForUpdate();

  if (!release) {
    return {
      source: 'release-feed',
      status: 'error',
      currentVersion: updateService.getCurrentVersion(),
      message: message ?? 'Could not reach the release feed.',
    };
  }

  return {
    source: 'release-feed',
    status: release.hasUpdate ? 'available' : 'none',
    currentVersion: release.currentVersion,
    latestVersion: release.latestVersion,
    releaseUrl: release.releaseUrl,
    message,
  };
}

export const desktopProService = {
  async getAutostartEnabled(): Promise<DesktopProAutostartStatus> {
    if (!isTauriRuntime()) {
      return { supported: false, enabled: false };
    }

    try {
      const { isEnabled } = await import('@tauri-apps/plugin-autostart');
      return { supported: true, enabled: await isEnabled() };
    } catch (error) {
      return { supported: false, enabled: false, error: errorMessage(error) };
    }
  },

  async setAutostart(enabled: boolean): Promise<DesktopProAutostartStatus> {
    if (!isTauriRuntime()) {
      return { supported: false, enabled: false };
    }

    try {
      const { enable, disable, isEnabled } = await import('@tauri-apps/plugin-autostart');
      if (enabled) {
        await enable();
      } else {
        await disable();
      }

      return { supported: true, enabled: await isEnabled() };
    } catch (error) {
      return { supported: false, enabled: false, error: errorMessage(error) };
    }
  },

  async checkForUpdate(): Promise<DesktopProUpdateResult> {
    if (!isTauriRuntime()) {
      return checkReleaseFeed();
    }

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check({ timeout: 10000 });

      if (!update) {
        return {
          source: 'native-updater',
          status: 'none',
          currentVersion: updateService.getCurrentVersion(),
        };
      }

      return {
        source: 'native-updater',
        status: 'available',
        currentVersion: update.currentVersion,
        latestVersion: update.version,
      };
    } catch (error) {
      return checkReleaseFeed(errorMessage(error));
    }
  },
};

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isTauriRuntime: vi.fn(),
  checkForUpdate: vi.fn(),
}));

vi.mock('../lib/platform', () => ({
  isTauriRuntime: mocks.isTauriRuntime,
}));

vi.mock('./updateService', () => ({
  updateService: {
    checkForUpdate: mocks.checkForUpdate,
  },
}));

import { desktopProService } from './desktopProService';

describe('desktopProService', () => {
  beforeEach(() => {
    mocks.isTauriRuntime.mockReset();
    mocks.checkForUpdate.mockReset();
  });

  it('reports autostart as unsupported in browser-safe mode', async () => {
    mocks.isTauriRuntime.mockReturnValue(false);

    await expect(desktopProService.getAutostartEnabled()).resolves.toEqual({
      supported: false,
      enabled: false,
    });
    await expect(desktopProService.setAutostart(true)).resolves.toEqual({
      supported: false,
      enabled: false,
    });
  });

  it('falls back to the existing release check when native updater is unavailable', async () => {
    mocks.isTauriRuntime.mockReturnValue(false);
    mocks.checkForUpdate.mockResolvedValue({
      hasUpdate: false,
      latestVersion: '0.2.1',
      releaseUrl: '',
      currentVersion: '0.2.1',
    });

    await expect(desktopProService.checkForUpdate()).resolves.toEqual(
      expect.objectContaining({
        source: 'release-feed',
        status: 'none',
        currentVersion: '0.2.1',
      }),
    );
  });
});

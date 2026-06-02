import { afterEach, describe, expect, it, vi } from 'vitest';

describe('migrations runtime guard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('skips SQLite migrations in browser demo mode', async () => {
    vi.stubGlobal('__TAURI__', undefined);
    vi.stubGlobal('__TAURI_INTERNALS__', undefined);

    const { runMigrations } = await import('./migrations');

    await expect(runMigrations()).resolves.toBeUndefined();
  });
});

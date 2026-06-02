import { afterEach, describe, expect, it, vi } from 'vitest';

describe('database runtime guard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('throws a clear error before loading SQLite in browser demo mode', async () => {
    vi.stubGlobal('__TAURI__', undefined);
    vi.stubGlobal('__TAURI_INTERNALS__', undefined);

    const { getDb } = await import('./db');

    await expect(getDb()).rejects.toThrow('Tauri database is unavailable in demo mode');
  });
});

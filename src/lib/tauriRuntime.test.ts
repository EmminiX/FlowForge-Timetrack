import { describe, expect, it, vi } from 'vitest';
import { safeEmit, safeInvoke, safeListen } from './tauriRuntime';

describe('safe Tauri runtime wrappers', () => {
  it('does not emit events outside Tauri', async () => {
    vi.stubGlobal('__TAURI__', undefined);
    vi.stubGlobal('__TAURI_INTERNALS__', undefined);

    await expect(safeEmit('demo-event', { ok: true })).resolves.toBe(false);
  });

  it('returns a no-op unlisten function outside Tauri', async () => {
    vi.stubGlobal('__TAURI__', undefined);
    vi.stubGlobal('__TAURI_INTERNALS__', undefined);

    const unlisten = await safeListen('demo-event', () => undefined);

    expect(unlisten()).toBeUndefined();
  });

  it('returns null for native commands outside Tauri', async () => {
    vi.stubGlobal('__TAURI__', undefined);
    vi.stubGlobal('__TAURI_INTERNALS__', undefined);

    await expect(safeInvoke<number>('get_idle_time')).resolves.toBeNull();
  });
});

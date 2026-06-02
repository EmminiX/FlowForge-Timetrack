import { describe, expect, it, vi } from 'vitest';

describe('shortcut service in browser mode', () => {
  it('subscribes as a no-op when Tauri is unavailable', async () => {
    vi.stubGlobal('__TAURI__', undefined);
    vi.stubGlobal('__TAURI_INTERNALS__', undefined);
    const callback = vi.fn();

    const { shortcutService } = await import('./shortcutService');
    const cleanup = await shortcutService.subscribe(callback);

    expect(callback).not.toHaveBeenCalled();
    expect(cleanup()).toBeUndefined();
  });
});

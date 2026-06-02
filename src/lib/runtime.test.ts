import { describe, expect, it } from 'vitest';
import { isTauriRuntime, shouldUseDemoMode } from './platform';

type RuntimeWindow = Window & typeof globalThis & Record<string, unknown>;

function runtimeWindow(markers: Record<string, unknown> = {}): RuntimeWindow {
  return markers as RuntimeWindow;
}

describe('runtime detection', () => {
  it('detects when Tauri globals are absent', () => {
    expect(isTauriRuntime(runtimeWindow())).toBe(false);
  });

  it('detects the public Tauri runtime marker', () => {
    expect(isTauriRuntime(runtimeWindow({ __TAURI__: {} }))).toBe(true);
  });

  it('detects the internal Tauri runtime marker', () => {
    expect(isTauriRuntime(runtimeWindow({ __TAURI_INTERNALS__: {} }))).toBe(true);
  });

  it('uses demo mode in browser preview when Tauri is absent', () => {
    expect(shouldUseDemoMode(runtimeWindow(), {})).toBe(true);
  });

  it('keeps desktop persistence mode when Tauri is present', () => {
    expect(shouldUseDemoMode(runtimeWindow({ __TAURI__: {} }), {})).toBe(false);
  });

  it('allows an explicit demo-mode override for screenshots and docs', () => {
    expect(
      shouldUseDemoMode(runtimeWindow({ __TAURI__: {} }), {
        VITE_DEMO_MODE: 'true',
      }),
    ).toBe(true);
  });
});

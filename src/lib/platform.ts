/**
 * Platform detection utilities for native desktop features
 */

type RuntimeWindow = Window & typeof globalThis & Record<string, unknown>;
type RuntimeEnv = Record<string, string | boolean | undefined>;

/**
 * Detect if running inside a Tauri webview.
 */
export function isTauriRuntime(targetWindow: RuntimeWindow = window as RuntimeWindow): boolean {
  return Boolean(targetWindow.__TAURI__ || targetWindow.__TAURI_INTERNALS__);
}

/**
 * Browser preview should use local sample data instead of Tauri-only APIs.
 */
export function shouldUseDemoMode(
  targetWindow: RuntimeWindow = window as RuntimeWindow,
  env: RuntimeEnv = import.meta.env,
): boolean {
  return env.VITE_DEMO_MODE === 'true' || env.VITE_DEMO_MODE === true || !isTauriRuntime(targetWindow);
}

/**
 * Detect if running on macOS
 * Uses Tauri API when available, falls back to user agent detection
 */
export function isMacOS(): boolean {
  // Check if running in Tauri environment
  if (isTauriRuntime()) {
    // In Tauri, check platform via navigator
    return navigator.platform?.toLowerCase().includes('mac') ?? false;
  }

  // Fallback for web preview
  return /Mac/.test(navigator.userAgent);
}

/**
 * Traffic light inset height for macOS overlay titlebar
 * Standard macOS traffic light buttons need ~52px clearance
 */
export const MACOS_TITLEBAR_HEIGHT = 52;

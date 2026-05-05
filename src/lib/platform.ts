/**
 * Platform detection utilities for native desktop features
 */

/**
 * Detect if running on macOS
 * Uses Tauri API when available, falls back to user agent detection
 */
export function isMacOS(): boolean {
  // Check if running in Tauri environment
  if ('__TAURI__' in window || '__TAURI_INTERNALS__' in window) {
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

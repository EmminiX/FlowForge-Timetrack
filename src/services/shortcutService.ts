// Shortcut service using Tauri's global-shortcut plugin JavaScript API
import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut';

export type ShortcutAction =
    | 'start'
    | 'pause'
    | 'stop'
    | 'toggle-widget'
    | 'toggle-sound';

// Map of shortcut keys to actions
const SHORTCUTS: Record<string, ShortcutAction> = {
    'CommandOrControl+Shift+S': 'start',
    'CommandOrControl+Shift+P': 'pause',
    'CommandOrControl+Shift+X': 'stop',
    'CommandOrControl+Shift+W': 'toggle-widget',
    'CommandOrControl+Shift+M': 'toggle-sound',
};

export interface ShortcutService {
    subscribe: (callback: (action: ShortcutAction) => void) => Promise<() => void>;
}

export const shortcutService: ShortcutService = {
    subscribe: async (callback) => {
        console.log('[Shortcuts] Registering global shortcuts via JS API...');

        const registeredKeys: string[] = [];

        for (const [key, action] of Object.entries(SHORTCUTS)) {
            try {
                // Check if already registered
                const alreadyRegistered = await isRegistered(key);
                if (alreadyRegistered) {
                    console.log(`[Shortcuts] ${key} already registered, unregistering first`);
                    await unregister(key);
                }

                await register(key, (event) => {
                    // Only trigger on keydown (not keyup)
                    if (event.state === 'Pressed') {
                        console.log(`[Shortcuts] Triggered: ${key} -> ${action}`);
                        callback(action);
                    }
                });
                registeredKeys.push(key);
                console.log(`[Shortcuts] Registered: ${key} -> ${action}`);
            } catch (error) {
                // Ignore HMR race conditions where key is briefly unavailable
                if (String(error).includes('RegisterEventHotKey failed')) {
                    console.warn(`[Shortcuts] Skipped duplicate registration for ${key} (harmless in dev)`);
                } else {
                    console.error(`[Shortcuts] Failed to register ${key}:`, error);
                }
            }
        }

        console.log('[Shortcuts] All shortcuts registered!');

        // Return cleanup function
        return async () => {
            console.log('[Shortcuts] Unregistering shortcuts...');
            for (const key of registeredKeys) {
                try {
                    await unregister(key);
                } catch (error) {
                    console.error(`[Shortcuts] Failed to unregister ${key}:`, error);
                }
            }
        };
    }
};

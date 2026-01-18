// Notification utilities
// Uses Tauri notification API when available, falls back to browser Notification API

export async function requestNotificationPermission(): Promise<boolean> {
    // Check if we're in Tauri
    const isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window;

    if (isTauri) {
        // Tauri handles permissions automatically
        return true;
    }

    // Browser fallback
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            return true;
        }
        const result = await Notification.requestPermission();
        return result === 'granted';
    }

    return false;
}

export async function showNotification(title: string, body: string): Promise<void> {
    const isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window;

    if (isTauri) {
        try {
            // Try to use Tauri notification plugin
            const { sendNotification, isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');

            let permissionGranted = await isPermissionGranted();
            if (!permissionGranted) {
                const permission = await requestPermission();
                permissionGranted = permission === 'granted';
            }

            if (permissionGranted) {
                await sendNotification({ title, body });
                return;
            }
        } catch (error) {
            console.warn('Tauri notification plugin not available, falling back to browser:', error);
        }
    }

    // Browser fallback
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
    }
}

// Convenience functions for timer events
export function notifyTimerStarted(projectName: string): Promise<void> {
    return showNotification('Timer Started', `Now tracking time for ${projectName}`);
}

export function notifyTimerStopped(projectName: string, duration: string): Promise<void> {
    return showNotification('Timer Stopped', `${projectName}: ${duration} recorded`);
}

export function notifyBreakTime(breakMinutes: number): Promise<void> {
    return showNotification('Time for a Break! ☕', `You've reached your work goal. Take a ${breakMinutes} minute break.`);
}

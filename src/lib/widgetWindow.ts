// Window control utilities for Tauri
// Handles showing/hiding the floating timer widget

export async function showWidget(): Promise<void> {
    const isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window;

    if (!isTauri) {
        console.warn('Widget is only available in Tauri app');
        return;
    }

    try {
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const widget = await WebviewWindow.getByLabel('widget');
        if (widget) {
            const isVisible = await widget.isVisible();
            if (!isVisible) {
                await widget.show();
                await widget.setFocus();
            }
        }
    } catch (error) {
        console.warn('Failed to show widget:', error);
    }
}

export async function hideWidget(): Promise<void> {
    const isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window;

    if (!isTauri) {
        return;
    }

    try {
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const widget = await WebviewWindow.getByLabel('widget');
        if (widget) {
            await widget.hide();
        }
    } catch (error) {
        console.warn('Failed to hide widget:', error);
    }
}

export async function toggleWidget(show: boolean): Promise<void> {
    if (show) {
        await showWidget();
    } else {
        await hideWidget();
    }
}

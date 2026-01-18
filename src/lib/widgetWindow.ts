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
                try {
                    // Position relative to main app window
                    const { PhysicalPosition } = await import('@tauri-apps/api/window');
                    const mainWindow = await WebviewWindow.getByLabel('main');

                    if (mainWindow) {
                        const mainPos = await mainWindow.outerPosition();
                        const mainSize = await mainWindow.outerSize();
                        // Get monitor scale factor for precise physical calculations
                        const monitor = await mainWindow.currentMonitor();
                        const scaleFactor = monitor?.scaleFactor || 1;

                        const widgetWidthPhysical = Math.round(260 * scaleFactor);
                        const marginPhysical = Math.round(20 * scaleFactor);
                        const topMarginPhysical = Math.round(50 * scaleFactor); // More clearance for title bar

                        // Calculate position: Main X + Main Width - Widget Width - Margin
                        const x = mainPos.x + mainSize.width - widgetWidthPhysical - marginPhysical;
                        const y = mainPos.y + topMarginPhysical;

                        // Ensure we don't place off-screen (basic check)
                        if (x > 0 && y > 0) {
                            await widget.setPosition(new PhysicalPosition(x, y));
                        }
                    }
                } catch (posError) {
                    console.error('[Widget] Positioning failed:', posError);
                }

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

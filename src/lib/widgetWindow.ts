// Window control utilities for Tauri
// Handles showing/hiding the floating timer widget

// Widget dimensions (logical pixels)
const WIDGET_WIDTH = 260;
const MARGIN_FROM_EDGE = 20; // Margin from window edge
const TOP_MARGIN = 50; // Top margin to clear title bar

export async function showWidget(): Promise<void> {
    const isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window;

    if (!isTauri) {
        console.warn('Widget is only available in Tauri app');
        return;
    }

    try {
        const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const { PhysicalPosition, currentMonitor } = await import('@tauri-apps/api/window');

        const widget = await WebviewWindow.getByLabel('widget');
        const mainWindow = await WebviewWindow.getByLabel('main');

        if (widget && mainWindow) {
            const isVisible = await widget.isVisible();
            if (!isVisible) {
                // Small delay to ensure windows are fully initialized
                await new Promise(resolve => setTimeout(resolve, 100));

                // Position widget at top-right corner of MAIN WINDOW
                await positionWidgetRelativeToMainWindow(widget, mainWindow, PhysicalPosition, currentMonitor);

                await widget.show();

                // Reposition after show to ensure it sticks
                await new Promise(resolve => setTimeout(resolve, 50));
                await positionWidgetRelativeToMainWindow(widget, mainWindow, PhysicalPosition, currentMonitor);

                await widget.setFocus();
            }
        }
    } catch (error) {
        console.warn('Failed to show widget:', error);
    }
}

async function positionWidgetRelativeToMainWindow(
    widget: NonNullable<Awaited<ReturnType<typeof import('@tauri-apps/api/webviewWindow').WebviewWindow.getByLabel>>>,
    mainWindow: NonNullable<Awaited<ReturnType<typeof import('@tauri-apps/api/webviewWindow').WebviewWindow.getByLabel>>>,
    PhysicalPosition: typeof import('@tauri-apps/api/window').PhysicalPosition,
    currentMonitor: typeof import('@tauri-apps/api/window').currentMonitor
): Promise<void> {
    try {
        // Get main window position and size
        const mainPos = await mainWindow.outerPosition();
        const mainSize = await mainWindow.outerSize();
        const monitor = await currentMonitor();
        const scaleFactor = monitor?.scaleFactor || 1;

        // Calculate widget dimensions in physical pixels
        const widgetWidthPhysical = Math.round(WIDGET_WIDTH * scaleFactor);
        const marginPhysical = Math.round(MARGIN_FROM_EDGE * scaleFactor);
        const topMarginPhysical = Math.round(TOP_MARGIN * scaleFactor);

        // Position at top-right corner of main window (inside the window bounds)
        // x = main window right edge - widget width - margin
        const x = mainPos.x + mainSize.width - widgetWidthPhysical - marginPhysical;
        // y = main window top + margin for title bar
        const y = mainPos.y + topMarginPhysical;

        console.log('[Widget] Positioning relative to main window:', {
            mainPos: { x: mainPos.x, y: mainPos.y },
            mainSize: { width: mainSize.width, height: mainSize.height },
            widgetPos: { x, y },
            scaleFactor
        });

        await widget.setPosition(new PhysicalPosition(x, y));

    } catch (error) {
        console.error('[Widget] Position calculation failed:', error);
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

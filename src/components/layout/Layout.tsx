import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { UpdateBanner } from '../UpdateBanner';
import { useThemeEffect } from '../../hooks/useThemeEffect';
import { useFontSizeEffect } from '../../hooks/useFontSizeEffect';
import { TimerSync } from '../../features/timer/TimerSync';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { isMacOS, MACOS_TITLEBAR_HEIGHT } from '../../lib/platform';

function isTauriRuntime() {
  return (
    typeof globalThis !== 'undefined' &&
    ('__TAURI__' in globalThis || '__TAURI_INTERNALS__' in globalThis)
  );
}

export function Layout() {
  // Initialize global effects here
  useThemeEffect();
  useFontSizeEffect();

  // Apply macOS-specific styling for traffic-light inset only in Tauri windows
  const isTauriMacOS = isMacOS() && isTauriRuntime();
  const topPadding = isTauriMacOS ? `${MACOS_TITLEBAR_HEIGHT}px` : '0';

  return (
    <div className='flex h-screen bg-background text-foreground overflow-hidden'>
      <TimerSync />
      <Sidebar topPadding={topPadding} />
      <div className='flex-1 flex flex-col min-w-0' style={{ paddingTop: topPadding }}>
        <UpdateBanner />
        <Header />
        <main className='flex-1 overflow-auto' style={{ padding: 'var(--shell-main-padding)' }}>
          <ErrorBoundary name='page-content'>
            <div className='page-enter'>
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

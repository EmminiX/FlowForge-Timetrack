import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { UpdateBanner } from '../UpdateBanner';
import { useThemeEffect } from '../../hooks/useThemeEffect';
import { useFontSizeEffect } from '../../hooks/useFontSizeEffect';
import { TimerSync } from '../../features/timer/TimerSync';
import { ErrorBoundary } from '../ui/ErrorBoundary';

export function Layout() {
  // Initialize global effects here
  useThemeEffect();
  useFontSizeEffect();

  return (
    <div className='app-shell flex h-screen overflow-hidden bg-background text-foreground'>
      <TimerSync />
      <Sidebar />
      <div className='flex-1 flex flex-col min-w-0'>
        <UpdateBanner />
        <Header />
        <main className='app-main flex-1 overflow-auto p-6 lg:p-8'>
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

import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { UpdateBanner } from '../UpdateBanner';
import { useThemeEffect } from '../../hooks/useThemeEffect';
import { useFontSizeEffect } from '../../hooks/useFontSizeEffect';
import { TimerSync } from '../../features/timer/TimerSync';

export function Layout() {
  // Initialize global effects here
  useThemeEffect();
  useFontSizeEffect();

  return (
    <div className='flex h-screen bg-background text-foreground overflow-hidden'>
      <TimerSync />
      <Sidebar />
      <div className='flex-1 flex flex-col min-w-0'>
        <UpdateBanner />
        <Header />
        <main className='flex-1 overflow-auto p-8'>
          <div className='page-enter'>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

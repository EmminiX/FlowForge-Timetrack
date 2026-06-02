import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DebugPanel } from './components/debug/DebugPanel';
import { IdleMonitor } from './components/IdleMonitor';
import { ActivityTimelineMonitor } from './components/ActivityTimelineMonitor';
import { WhatsNewModal } from './components/WhatsNewModal';
import { Widget } from './pages/Widget';

import { SettingsProvider } from './contexts/SettingsContext';
import { useShortcuts } from './hooks/useShortcuts';
import { ToastContainer } from './components/ui/Toast';
import { KeyboardShortcutsDialog } from './components/ui/KeyboardShortcutsDialog';

import { lazy, Suspense, useState, useEffect } from 'react';
import { useTimerStore } from './stores/timerStore';

const Dashboard = lazy(() =>
  import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })),
);
const Clients = lazy(() =>
  import('./pages/Clients').then((module) => ({ default: module.Clients })),
);
const Projects = lazy(() =>
  import('./pages/Projects').then((module) => ({ default: module.Projects })),
);
const TimeEntries = lazy(() =>
  import('./pages/TimeEntries').then((module) => ({ default: module.TimeEntries })),
);
const Invoices = lazy(() =>
  import('./pages/Invoices').then((module) => ({ default: module.Invoices })),
);
const Expenses = lazy(() =>
  import('./pages/Expenses').then((module) => ({ default: module.Expenses })),
);
const Timeline = lazy(() =>
  import('./pages/Timeline').then((module) => ({ default: module.Timeline })),
);
const Products = lazy(() =>
  import('./pages/Products').then((module) => ({ default: module.Products })),
);
const Settings = lazy(() =>
  import('./pages/Settings').then((module) => ({ default: module.Settings })),
);

function RouteFallback() {
  return (
    <div className='flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground'>
      Loading...
    </div>
  );
}

// Component that uses hooks requiring SettingsProvider context
function AppContent() {
  // Enable global keyboard shortcuts
  useShortcuts();

  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.key === '?' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      {/* Idle detection monitor */}
      <IdleMonitor />
      <ActivityTimelineMonitor />
      <WhatsNewModal />

      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Widget window - standalone route */}
            <Route path='/widget' element={<Widget />} />

            {/* Main app routes */}
            <Route path='/' element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path='clients' element={<Clients />} />
              <Route path='projects' element={<Projects />} />
              <Route path='time-entries' element={<TimeEntries />} />
              <Route path='time-entries/calendar' element={<TimeEntries />} />
              <Route path='invoices' element={<Invoices />} />
              <Route path='expenses' element={<Expenses />} />
              <Route path='timeline' element={<Timeline />} />
              <Route path='products' element={<Products />} />
              <Route path='settings' element={<Settings />} />
            </Route>
          </Routes>
        </Suspense>
        {/* Debug panel - only visible during development */}
        {import.meta.env.DEV && <DebugPanel />}
      </BrowserRouter>
      <ToastContainer />
      <KeyboardShortcutsDialog isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </>
  );
}

function App() {
  // Reset timer on fresh app launch
  useEffect(() => {
    const isReload = sessionStorage.getItem('app_initialized');
    if (!isReload) {
      // Fresh launch - reset timer
      useTimerStore.getState().reset();
      sessionStorage.setItem('app_initialized', 'true');
    }
  }, []);

  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

export default App;

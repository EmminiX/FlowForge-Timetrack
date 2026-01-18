import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DebugPanel } from './components/debug/DebugPanel';
import { IdleMonitor } from './components/IdleMonitor';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Projects } from './pages/Projects';
import { TimeEntries } from './pages/TimeEntries';
import { Invoices } from './pages/Invoices';
import { Products } from './pages/Products';
import { Settings } from './pages/Settings';
import { Widget } from './pages/Widget';

import { SettingsProvider } from './contexts/SettingsContext';
import { useShortcuts } from './hooks/useShortcuts';

import { useEffect } from 'react';
import { useTimerStore } from './stores/timerStore';

// Component that uses hooks requiring SettingsProvider context
function AppContent() {
  // Enable global keyboard shortcuts
  useShortcuts();

  return (
    <>
      {/* Idle detection monitor */}
      <IdleMonitor />

      <BrowserRouter>
        <Routes>
          {/* Widget window - standalone route */}
          <Route path="/widget" element={<Widget />} />

          {/* Main app routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="projects" element={<Projects />} />
            <Route path="time-entries" element={<TimeEntries />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="products" element={<Products />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
        {/* Debug panel - only visible during development */}
        {import.meta.env.DEV && <DebugPanel />}
      </BrowserRouter>
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
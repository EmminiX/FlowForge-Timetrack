import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import '@fontsource-variable/lexend';
import { runMigrations } from './lib/migrations';
import { dbLogger } from './lib/logger';

// Initialize database on app startup, then render
async function init() {
  try {
    await runMigrations();
    dbLogger.info('Database initialized successfully');
  } catch (err) {
    dbLogger.error('Failed to initialize database:', err);
  }

  // Render app after migrations (even if they fail, we show the app)
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

init();

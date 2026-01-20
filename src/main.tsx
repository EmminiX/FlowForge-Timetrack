import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { runMigrations } from './lib/migrations';

// Initialize database on app startup, then render
async function init() {
  try {
    await runMigrations();
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }

  // Render app after migrations (even if they fail, we show the app)
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

init();

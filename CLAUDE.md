# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowForge-Track is a Tauri 2 desktop application for time tracking and invoicing, built with React 19, TypeScript, and SQLite. It features a main application window with full routing and a floating timer widget for quick access. The app supports offline-first operation with local database persistence.

## Development Commands

### Tauri Development
```bash
# Start Tauri app in dev mode (launches both Vite dev server and Tauri)
pnpm tauri dev

# Build Tauri app for production (creates platform-specific installer)
pnpm tauri build
```

### Frontend-Only Development
```bash
# Start Vite dev server only (without Tauri window)
pnpm dev

# Build frontend for production
pnpm build

# Preview production build
pnpm preview
```

### Testing
```bash
# Run tests with Vitest
pnpm test

# Type checking (no emit, checking only)
tsc
```

## Architecture

### Database Layer
- **SQLite database** via Tauri plugin (`@tauri-apps/plugin-sql`)
- Database file: `flowforge.db` (stored in Tauri app data directory)
- **Dual migration system**:
  - Rust migrations in `src-tauri/src/lib.rs` (Tauri plugin migrations)
  - TypeScript migrations in `src/lib/migrations.ts` (run on app startup)
  - Both must be kept in sync when adding new tables/columns
- **Singleton pattern**: `src/lib/db.ts` provides `getDb()` for connection reuse
- **Service layer**: All database operations encapsulated in `src/services/` (clientService, projectService, etc.)

### State Management
- **Zustand stores** for global state:
  - `timerStore.ts`: Timer state with persistence (running/paused/idle, project info, elapsed time)
  - `settings.ts`: App settings (imported but minimal usage)
- **Settings Context**: `src/contexts/SettingsContext.tsx` manages theme, font size, density, animations via React Context
- **Persistence**: Timer state persists to localStorage via Zustand middleware for crash recovery

### Window Management
- **Two-window architecture** defined in `src-tauri/tauri.conf.json`:
  - **Main window** (`label: "main"`): Full app with routing (1024x768, resizable)
  - **Widget window** (`label: "widget"`): Floating timer (260x44, always-on-top, transparent, no decorations)
- **Widget control**: `src/lib/widgetWindow.ts` provides `showWidget()`, `hideWidget()`, `toggleWidget()`
- Widget visibility controlled via settings with Tauri event listeners

### Routing Structure
- **React Router v7** with nested routes in `App.tsx`:
  - `/` → Dashboard (main landing)
  - `/clients` → Client management
  - `/projects` → Project management
  - `/time-entries` → Time entry list
  - `/invoices` → Invoice management
  - `/products` → Product catalog
  - `/settings` → App settings
  - `/widget` → **Standalone route** for floating widget (not nested in Layout)
- Layout wrapper (`src/components/layout/Layout.tsx`) provides sidebar navigation for main routes

### Feature Organization
- **Feature-based structure** in `src/features/`:
  - Each feature (clients, projects, invoices, timer, etc.) contains related components
  - `index.ts` files re-export public API
  - Components are self-contained with forms, lists, and business logic
- **Shared UI components** in `src/components/ui/`
- **Service layer** (`src/services/`) handles all data persistence

### Type System
- **Centralized types** in `src/types/`:
  - `client.ts`, `project.ts`, `timeEntry.ts`, `invoice.ts`, `product.ts`, `settings.ts`
  - All re-exported from `src/types/index.ts`
- **Strict TypeScript** config with no unused variables/parameters

## Key Technical Details

### Timer Functionality
- **Three states**: idle, running, paused
- **Pause accumulation**: Tracks total pause time separately from elapsed time
- **Session persistence**: Timer survives app reload but resets on fresh launch
- **Widget synchronization**: `TimerSync.tsx` uses Tauri events to sync state between main app and widget

### Database Patterns
- **UUID-based IDs** generated via `crypto.randomUUID()`
- **ISO timestamp strings** for dates (`new Date().toISOString()`)
- **Soft deletes not used** - direct CASCADE on foreign keys
- **Settings stored as key-value pairs** in `settings` table (JSON stringified values)

### Tauri Integration
- **Plugins in use**:
  - `tauri-plugin-sql`: Database access
  - `tauri-plugin-dialog`: File/folder dialogs
  - `tauri-plugin-fs`: File system operations
  - `tauri-plugin-notification`: System notifications
  - `tauri-plugin-opener`: Open URLs/files with default apps
- **Environment detection**: Check `'__TAURI__' in window` or `'__TAURI_INTERNALS__' in window` before using Tauri APIs

### Styling System
- **Tailwind CSS 4** with Vite plugin (`@tailwindcss/vite`)
- **Dark mode** support via class strategy (`.dark` class on `<html>`)
- **Theme application**: SettingsContext applies theme/fontSize/density/animations to root element
- **CSS custom properties** for dynamic scaling (font sizes, density)

### PDF Generation
- **jsPDF** library for invoice export
- Implementation in invoice components (not a dedicated service)

## Common Patterns

### Adding a New Table
1. Add migration SQL to `src-tauri/src/lib.rs` (increment version)
2. Add equivalent TypeScript migration to `src/lib/migrations.ts`
3. Create type in `src/types/`
4. Create service in `src/services/`
5. Export service from `src/services/index.ts`

### Creating a New Feature
1. Create directory in `src/features/[feature-name]/`
2. Add components (List, Form, etc.)
3. Create `index.ts` to export public components
4. Add route in `App.tsx` if needed
5. Add navigation link in `Sidebar.tsx` if applicable

### Working with Settings
- Settings are loaded asynchronously on app start via `SettingsContext`
- Use `useSettings()` hook to access current settings and updater functions
- Settings persist to database immediately on change
- Theme/fontSize/density/animations applied via CSS custom properties on `<html>`

## Global Keyboard Shortcuts

- **Cmd+Shift+S** (Mac) / **Ctrl+Shift+S** (Windows/Linux): Start/Resume timer
- **Cmd+Shift+P** (Mac) / **Ctrl+Shift+P** (Windows/Linux): Pause timer
- **Cmd+Shift+X** (Mac) / **Ctrl+Shift+X** (Windows/Linux): Stop timer and save time entry
- Implemented via `tauri-plugin-global-shortcut` (desktop only)
- Requires Accessibility permissions on macOS (System Settings → Privacy & Security → Accessibility)
- Shortcuts registered in `src/services/shortcutService.ts`
- Hook integration in `src/hooks/useShortcuts.ts`

## Idle Detection

- Rust command `get_idle_time()` in `src-tauri/src/lib.rs` uses `user-idle` crate
- `IdleMonitor` component automatically pauses timer after 5 minutes of system inactivity
- Prompts user to resume or discard idle time when activity resumes

## Important Implementation Notes

### Widget Positioning
- Widget positioned relative to main window via `src/lib/widgetWindow.ts:showWidget()`
- Uses physical pixel calculations with monitor scale factor for accuracy
- Default position: top-right corner of main window with 20px margin and 50px top clearance
- Widget state (show/hide) controlled by settings and synchronized with Tauri events

### Timer State Synchronization
- `TimerSync.tsx` component uses Tauri events to sync state between main app and widget
- Timer state persists to localStorage via Zustand middleware for crash recovery
- Timer resets on fresh app launch (detected via sessionStorage flag)
- Three distinct states: `idle`, `running`, `paused`
- Pause duration tracked separately from elapsed time

### Database Migration Strategy
- **Dual migration system** requires keeping Rust and TypeScript migrations in sync:
  - Rust migrations: `src-tauri/src/lib.rs` (Tauri plugin, runs first)
  - TypeScript migrations: `src/lib/migrations.ts` (runs on app startup)
- Add new columns/tables to both files when extending schema
- Migrations use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` for idempotency
- TypeScript migrations use try-catch for `ALTER TABLE` to handle already-existing columns

### Window Lifecycle
- **Critical**: Closing main window exits entire app and destroys widget (see `src-tauri/src/lib.rs` event handler)
- macOS dock icon click restores minimized main window (handles `RunEvent::Reopen`)
- Widget window is separate webview with `/widget` route
- Main window: 1024x768 default, resizable (min 800x600)
- Widget window: 260x44 fixed, always-on-top, no decorations, transparent, hidden on launch

## Testing Notes

- Vitest configured with React Testing Library and jsdom
- Run tests with `pnpm test`
- Currently minimal test coverage
- Database changes require full app restart to run migrations (Tauri dev mode doesn't auto-apply migrations)

# Roadmap Suite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the roadmap features end to end: Command Center 2.0, Calendar Time View, Private Auto-Timeline, Project Budgets + Scope Alerts, Expense + Receipt Tracking, Desktop Pro Mode, and Demo / Web-Safe Mode.

**Architecture:** Keep the existing React + Tauri + SQLite service pattern. Add browser-safe adapters where the app currently crosses into Tauri APIs, then add feature slices behind typed services and focused UI routes. Keep all sensitive timeline/activity data local and opt-in.

**Tech Stack:** React 19, TypeScript, React Router, Zustand, Tailwind CSS 4, Tauri 2, SQLite, Vitest, React Testing Library, jsPDF.

## Phase 0: Baseline And Guardrails

### Task 0.1: Restore Package Workspace Install

**Files:**

- Modify: `pnpm-workspace.yaml`

**Steps:**

1. Add a root package entry so `pnpm install` works in this repository.
2. Run `pnpm install`.
3. Run `pnpm test -- --run`.
4. Run `pnpm build`.
5. Commit as `chore: restore pnpm workspace package entry`.

**Acceptance:**

- `pnpm install` exits 0.
- Existing tests pass.
- Production build exits 0.

## Phase 1: Demo / Web-Safe Mode

### Task 1.1: Runtime Detection

**Files:**

- Create: `src/lib/runtime.test.ts`
- Modify: `src/lib/platform.ts`

**Steps:**

1. Write failing tests for `isTauriRuntime()` and `shouldUseDemoMode()`.
2. Verify the tests fail because the functions do not exist.
3. Add runtime helpers:
   - `isTauriRuntime(win = window)` checks `__TAURI__` or `__TAURI_INTERNALS__`.
   - `shouldUseDemoMode(win = window, env = import.meta.env)` returns true in browser/Vite mode when Tauri is absent.
4. Run `pnpm test -- --run src/lib/runtime.test.ts`.
5. Commit as `feat: add runtime mode detection`.

**Acceptance:**

- Tests prove browser mode does not call Tauri APIs by default.
- Desktop/Tauri runtime remains the persistence mode.

### Task 1.2: Demo Data Store

**Files:**

- Create: `src/services/demoData.test.ts`
- Create: `src/services/demoData.ts`

**Steps:**

1. Write failing tests for sample clients, projects, time entries, invoices, and products.
2. Verify the tests fail because the demo store does not exist.
3. Add immutable seed data and small query helpers.
4. Add mutation helpers for create/update/delete where the UI needs demo write behavior.
5. Run `pnpm test -- --run src/services/demoData.test.ts`.
6. Commit as `feat: add browser demo data store`.

**Acceptance:**

- Demo data includes enough records for dashboard, timer, clients, projects, time entries, invoices, and products.
- Data has realistic dates relative to the current day so dashboard charts are populated.

### Task 1.3: Web-Safe Services

**Files:**

- Modify: `src/services/clientService.ts`
- Modify: `src/services/projectService.ts`
- Modify: `src/services/timeEntryService.ts`
- Modify: `src/services/invoiceService.ts`
- Modify: `src/services/productService.ts`
- Modify: `src/services/dashboardService.ts`
- Modify: `src/services/settingsService.ts`
- Test: `src/services/demoServices.test.ts`

**Steps:**

1. Write failing tests that call core service methods with Tauri absent.
2. Verify failures reproduce the existing browser-mode Tauri API crash.
3. Route service calls to demo data when `shouldUseDemoMode()` is true.
4. Keep SQLite paths unchanged for Tauri runtime.
5. Run `pnpm test -- --run src/services/demoServices.test.ts`.
6. Commit as `feat: use demo services outside Tauri`.

**Acceptance:**

- Vite/browser mode loads without SQLite/Tauri invoke errors.
- Tauri runtime still uses SQLite through `getDb()`.

### Task 1.4: Browser Verification

**Steps:**

1. Start `pnpm dev --host 127.0.0.1`.
2. Use Browser on `http://127.0.0.1:1420/`.
3. Confirm the dashboard renders sample data.
4. Confirm Browser console has no Tauri API errors.
5. Commit any fixes required.

**Acceptance:**

- The app is usable in Vite mode for screenshots, docs, and onboarding.

## Phase 2: Command Center 2.0

### Task 2.1: Command Model

**Files:**

- Create: `src/hooks/useCommandCenter.test.ts`
- Rename or Modify: `src/hooks/useGlobalSearch.ts`
- Modify: `src/components/layout/Header.tsx`

**Steps:**

1. Write failing tests for mixed search results and action results.
2. Add a `CommandCenterItem` model with `search` and `action` variants.
3. Preserve client/project/invoice search.
4. Add actions: start timer, create invoice, add client, mark invoice paid, export invoice PDF, and quick-add time.
5. Run focused tests.
6. Commit as `feat: add command center action model`.

**Acceptance:**

- `Cmd/Ctrl+K` shows actions and search results in one keyboard-friendly list.
- Existing search behavior remains.

### Task 2.2: Action Execution

**Files:**

- Create: `src/services/invoicePdfService.ts`
- Modify: `src/features/invoices/InvoicesList.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/stores/timerStore.ts`
- Test: `src/services/invoicePdfService.test.ts`

**Steps:**

1. Extract PDF generation into a reusable service.
2. Add command handlers for timer, invoice status, export, and quick-add time.
3. Add modals or route state for forms that need input.
4. Test command execution with service-level tests and component tests.
5. Commit as `feat: execute command center actions`.

**Acceptance:**

- Keyboard-only users can complete the named actions from `Cmd/Ctrl+K`.

## Phase 3: Calendar Time View

### Task 3.1: Calendar Data Model

**Files:**

- Create: `src/features/time-entries/calendarUtils.test.ts`
- Create: `src/features/time-entries/calendarUtils.ts`
- Modify: `src/services/timeEntryService.ts`

**Steps:**

1. Write tests for day/week grouping, gap detection, resize math, and overlap handling.
2. Add calendar utility functions.
3. Add service helper for a date range.
4. Commit as `feat: add calendar time utilities`.

**Acceptance:**

- Utilities can map time entries to day/week blocks and find gaps.

### Task 3.2: Calendar UI

**Files:**

- Create: `src/features/time-entries/CalendarTimeView.tsx`
- Modify: `src/pages/TimeEntries.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Test: `src/features/time-entries/CalendarTimeView.test.tsx`

**Steps:**

1. Add day/week tabs.
2. Render entries as blocks on a stable time grid.
3. Add drag-to-resize with keyboard-accessible fallback controls.
4. Add quick-create for missed work gaps.
5. Commit as `feat: add calendar time view`.

**Acceptance:**

- Users can view day/week time, spot gaps, add missed work, and resize entries.

## Phase 4: Budgets, Scope Alerts, And Expenses

### Task 4.1: Project Budget Schema

**Files:**

- Modify: `src/types/project.ts`
- Modify: `src/lib/migrations.ts`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/services/projectService.ts`
- Test: `src/services/projectBudget.test.ts`

**Steps:**

1. Add tests for hourly budgets, fixed fees, retainers, and near-limit state.
2. Add synced TypeScript and Rust migrations.
3. Add project fields and service mapping.
4. Surface budget status in project stats and dashboard data.
5. Commit as `feat: add project budgets and alerts`.

**Acceptance:**

- Projects can store and report budget/scope status.
- Dashboard can warn near or over limit.

### Task 4.2: Expenses And Receipts

**Files:**

- Create: `src/types/expense.ts`
- Create: `src/services/expenseService.ts`
- Create: `src/features/expenses/ExpensesList.tsx`
- Modify: `src/lib/migrations.ts`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Test: `src/services/expenseService.test.ts`

**Steps:**

1. Add tests for billable expenses, receipt path storage, and invoice inclusion.
2. Add synced migrations.
3. Add service CRUD.
4. Add UI list/form with receipt attachment through Tauri file APIs in desktop mode and demo-safe mock paths in browser mode.
5. Add invoice line-item import from billable expenses.
6. Commit as `feat: add expenses and receipt tracking`.

**Acceptance:**

- Expenses can be tracked, attached to receipts, and pulled into invoices.

## Phase 5: Private Auto-Timeline

### Task 5.1: Timeline Schema And Privacy Settings

**Files:**

- Create: `src/types/activityTimeline.ts`
- Create: `src/services/activityTimelineService.ts`
- Modify: `src/types/settings.ts`
- Modify: `src/pages/Settings.tsx`
- Modify: `src/lib/migrations.ts`
- Modify: `src-tauri/src/lib.rs`
- Test: `src/services/activityTimelineService.test.ts`

**Steps:**

1. Add tests for opt-in settings and local-only timeline events.
2. Add timeline tables and settings.
3. Add CRUD for activity events and suggested time entries.
4. Commit as `feat: add private activity timeline data`.

**Acceptance:**

- Timeline data is local-only and disabled until the user opts in.

### Task 5.2: Timeline Capture And Suggestions

**Files:**

- Modify: `src-tauri/src/lib.rs`
- Create: `src/lib/activityTimeline.ts`
- Create: `src/features/timeline/TimelineReview.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Test: `src/lib/activityTimeline.test.ts`

**Steps:**

1. Add a privacy-first native command for active window/app snapshots where supported.
2. Add idle-gap correlation with existing idle detection.
3. Add review UI where users approve suggested entries before saving.
4. Commit as `feat: add private auto timeline review`.

**Acceptance:**

- No activity capture happens without opt-in.
- Suggested entries require user approval.

## Phase 6: Desktop Pro Mode

### Task 6.1: Native Plugins And Config

**Files:**

- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`
- Test: `src/security/tauriCapabilities.test.ts`

**Steps:**

1. Add tests/config checks for required capabilities.
2. Add Tauri plugins for tray, autostart, window state, and updater as supported by current Tauri version.
3. Wire plugin initialization.
4. Commit as `feat: add desktop pro native plugins`.

**Acceptance:**

- Tray, autostart, saved window/widget position, and updater have native support.

### Task 6.2: Desktop Pro Settings

**Files:**

- Modify: `src/pages/Settings.tsx`
- Create: `src/lib/desktopPro.ts`
- Test: `src/lib/desktopPro.test.ts`

**Steps:**

1. Add settings toggles for tray behavior, launch at login, and window position restore.
2. Mock safely in browser/demo mode.
3. Add updater controls if missing from current UI.
4. Commit as `feat: add desktop pro settings`.

**Acceptance:**

- Desktop controls are visible and safe in demo mode.

## Phase 7: Final Verification And GitHub

### Task 7.1: Full Verification

**Commands:**

- `pnpm test -- --run`
- `pnpm build`
- `pnpm tauri build` when native dependencies are ready
- Browser verification on `http://127.0.0.1:1420/`

**Acceptance:**

- Tests pass.
- Build passes.
- Browser mode has no Tauri API errors.
- Desktop mode still starts with SQLite persistence.

### Task 7.2: Publish Branch And PR

**Steps:**

1. Review `git status --short`.
2. Commit remaining intentional changes.
3. Push `codex/roadmap-suite`.
4. Use GitHub to open a draft PR against `main`.

**Acceptance:**

- GitHub has a draft PR with a checklist covering all roadmap items.

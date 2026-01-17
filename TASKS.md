# FlowForge React - Build Tasks

## Current State
- Basic Tauri + React + TypeScript setup ✅
- Routing with react-router ✅
- Settings store with theme/fontScale ✅
- Theme/font hooks ✅
- Sidebar navigation (placeholder links) ✅
- Placeholder pages: Dashboard, Clients, Projects, Settings ✅

---

## Phase 1: Database & Types

- [ ] Create TypeScript interfaces in `src/types/`
  - [ ] `client.ts`
  - [ ] `project.ts`  
  - [ ] `timeEntry.ts`
  - [ ] `invoice.ts`
  - [ ] `settings.ts`

- [ ] Implement database migrations in `src/lib/migrations.ts`
- [ ] Run migrations on app startup in `main.tsx`

---

## Phase 2: Data Services

- [ ] Create CRUD services
  - [ ] `src/services/clientService.ts`
  - [ ] `src/services/projectService.ts`
  - [ ] `src/services/timeEntryService.ts`
  - [ ] `src/services/invoiceService.ts`
  - [ ] `src/services/settingsService.ts` (for business info)

---

## Phase 3: UI Components

- [ ] Create reusable UI components in `src/components/ui/`
  - [ ] Button (variants: primary, secondary, destructive)
  - [ ] Input
  - [ ] Textarea
  - [ ] Select
  - [ ] Modal/Dialog
  - [ ] Badge
  - [ ] Card
  - [ ] DataTable/List

---

## Phase 4: Clients Feature

- [ ] Build `ClientsList` component with search
- [ ] Build `ClientForm` component (create/edit)
- [ ] Implement create, read, update, delete
- [ ] Show totals (hours, billable)
- [ ] Update `/clients` page

---

## Phase 5: Projects Feature

- [ ] Build `ProjectsList` component with status filter
- [ ] Build `ProjectForm` component
- [ ] Color picker for project color
- [ ] Link to client
- [ ] Show tracked time
- [ ] Update `/projects` page

---

## Phase 6: Timer Feature

- [ ] Create timer store (`src/stores/timerStore.ts`)
  - [ ] State: idle, running, paused
  - [ ] Track: projectId, startTime, pauseDuration
  - [ ] Persist for crash recovery

- [ ] Create timer service for start/pause/resume/stop
- [ ] Build `TimerView` page (`/timer` or Dashboard)
- [ ] Large time display with project selector
- [ ] Start/Pause/Resume/Stop buttons

---

## Phase 7: Time Entries Feature

- [ ] Build `TimeEntriesList` with filters
- [ ] Date range picker
- [ ] Project/client filter dropdowns
- [ ] Billable filter
- [ ] Inline note editing
- [ ] Bulk delete/mark as billed
- [ ] Add `/time-entries` page and route

---

## Phase 8: Invoices Feature

- [ ] Build `InvoicesList` with status filter
- [ ] Build create invoice wizard:
  - [ ] Step 1: Select client
  - [ ] Step 2: Pick projects, import hours
  - [ ] Step 3: Edit line items
  - [ ] Step 4: Dates, notes, tax
- [ ] Build `InvoicePreview` component
- [ ] Implement PDF export with jspdf
- [ ] Add `/invoices` page and route

---

## Phase 9: Settings Completion

- [ ] Add General tab (widget toggle, notifications, sounds)
- [ ] Ensure font size scales ALL text (not just preview)
- [ ] Add Accessibility tab
- [ ] Add Business tab (logo, address, etc.)
- [ ] Persist business settings to database

---

## Phase 10: Floating Timer Widget

- [ ] Configure Tauri for multi-window
- [ ] Create floating window entry point
- [ ] Build FloatingTimer component
- [ ] Always-on-top, draggable
- [ ] Position persistence
- [ ] Communication with main window

---

## Phase 11: Polish

- [ ] Update sidebar with all nav items
- [ ] Keyboard shortcuts
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Final testing

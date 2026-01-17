# FlowForge React - Build Tasks

## Current State
- Basic Tauri + React + TypeScript setup ✅
- Routing with react-router ✅
- Settings store with theme/fontScale ✅
- Theme/font hooks ✅
- Sidebar navigation ✅
- All core features implemented ✅

---

## Phase 1: Database & Types ✅

- [x] Create TypeScript interfaces in `src/types/`
  - [x] `client.ts`
  - [x] `project.ts`  
  - [x] `timeEntry.ts`
  - [x] `invoice.ts`
  - [x] `settings.ts`

- [x] Implement database migrations in `src/lib/migrations.ts`
- [x] Run migrations on app startup in `main.tsx`

---

## Phase 2: Data Services ✅

- [x] Create CRUD services
  - [x] `src/services/clientService.ts`
  - [x] `src/services/projectService.ts`
  - [x] `src/services/timeEntryService.ts`
  - [x] `src/services/invoiceService.ts`
  - [x] `src/services/settingsService.ts`

---

## Phase 3: UI Components ✅

- [x] Create reusable UI components in `src/components/ui/`
  - [x] Button
  - [x] Input
  - [x] Textarea
  - [x] Select
  - [x] Modal/Dialog
  - [x] Badge
  - [x] Card
  - [x] ColorPicker
  - [x] EmptyState
  - [x] ConfirmDialog

---

## Phase 4: Clients Feature ✅

- [x] Build `ClientsList` component with search
- [x] Build `ClientForm` component (create/edit)
- [x] Implement create, read, update, delete
- [x] Show totals (hours, billable)
- [x] Update `/clients` page

---

## Phase 5: Projects Feature ✅

- [x] Build `ProjectsList` component with status filter
- [x] Build `ProjectForm` component
- [x] Color picker for project color
- [x] Link to client
- [x] Show tracked time
- [x] Update `/projects` page

---

## Phase 6: Timer Feature ✅

- [x] Create timer store (`src/stores/timerStore.ts`)
  - [x] State: idle, running, paused
  - [x] Track: projectId, startTime, pauseDuration
  - [x] Persist for crash recovery

- [x] Create timer service for start/pause/resume/stop
- [x] Build `TimerView` page (Dashboard)
- [x] Large time display with project selector
- [x] Start/Pause/Resume/Stop buttons

---

## Phase 7: Time Entries Feature ✅

- [x] Build `TimeEntriesList` with filters
- [x] Project/client filter dropdowns
- [x] Billable filter
- [x] Bulk delete/mark as billed
- [x] Add `/time-entries` page and route

---

## Phase 8: Invoices Feature ✅

- [x] Build `InvoicesList` with status filters
- [x] Build create invoice wizard:
  - [x] Step 1: Client selection
  - [x] Step 2: Line item editing
  - [x] Step 3: Dates, notes, tax
- [x] Build `InvoicePreview` component
- [x] Add `/invoices` page and route

---

## Phase 9: Settings ✅

- [x] Add General tab (widget toggle, notifications, sounds)
- [x] Font size scales ALL text
- [x] Add Accessibility tab
- [x] Add Business tab (logo, address, etc.)
- [x] Persist settings to database

---

## Remaining Tasks

### Phase 10: Floating Timer Widget
- [ ] Configure Tauri for multi-window
- [ ] Create floating window entry point
- [ ] Build FloatingTimer component
- [ ] Always-on-top, draggable
- [ ] Position persistence

### Phase 11: Polish
- [ ] PDF Export implementation (jspdf)
- [ ] Keyboard shortcuts
- [ ] Loading states refinement
- [ ] Error handling
- [ ] Final testing

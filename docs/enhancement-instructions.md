# FlowForge-Track Enhancement Instructions

> **For Claude Code Cloud** — Execute these tasks sequentially on a new branch.
> Each phase ends with a build gate. Do not proceed to the next phase if the gate fails.

## Prerequisites

```bash
# 1. Install dependencies
pnpm install

# 2. Create feature branch
git checkout -b feature/enhancements-v0.2.0

# 3. Verify clean build
pnpm build && pnpm test
```

**Tech stack reference:** React 19, TypeScript 5.8 (strict), Tailwind CSS 4, jsPDF 4.0, Zustand 5, Tauri 2, SQLite, Vite 7, Vitest.

**Important rules:**
- Run `pnpm build` after every task. Fix any TypeScript errors before moving on.
- Do NOT add `console.log` statements. Use the logger system in `src/lib/logger.ts`.
- Do NOT add `@ts-ignore` comments. Fix type issues properly.
- Do NOT install new npm packages unless explicitly stated. All tasks use existing dependencies.
- Commit after each phase with the provided commit message.

---

## Phase 1: Critical Bug Fixes

### Task 1.1: PDF Invoice Multi-Page Pagination

**Problem:** Invoice PDF export truncates content at the first page. The `handleExportPDF()` function in `InvoicePreview` writes content with continuously incrementing `y` position but never checks if content exceeds page height. No `doc.addPage()` calls exist.

**File to modify:** `src/features/invoices/InvoicesList.tsx`

**Current code structure (lines 765-1046):**
- Line 773: `const doc = new jsPDF()` — creates single page
- Line 774: `const pageWidth = doc.internal.pageSize.getWidth()`
- Line 775: `let y = 20`
- Lines 777-820: Business header (logo, name, address, phone, VAT)
- Lines 822-850: Invoice details (right-aligned: number, dates, status)
- Lines 852-879: Bill To section (client name, address, email, phone, VAT)
- Lines 882-910: Table header + line items loop (`y += 6` per item, NO page check)
- Lines 912-935: Totals (subtotal, tax, total)
- Lines 937-961: Notes and payment terms
- Lines 963-986: Payment links
- Lines 988-992: Footer (uses `pageHeight` but only for positioning, not for page breaks)

**Implementation steps:**

**Step 1:** Move `pageHeight` to the top and define constants. Replace lines 773-775 with:

```typescript
const doc = new jsPDF();
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 25; // Reserve space for footer
let y = MARGIN_TOP;
```

**Step 2:** Add a `checkPageBreak` helper function right after the constants above:

```typescript
// Helper: check if content fits on current page, add new page if not
const checkPageBreak = (currentY: number, requiredSpace: number): number => {
  if (currentY + requiredSpace > pageHeight - MARGIN_BOTTOM) {
    doc.addPage();
    return MARGIN_TOP;
  }
  return currentY;
};

// Helper: draw the line items table header
const drawTableHeader = (atY: number): number => {
  doc.setFillColor(240, 240, 240);
  doc.rect(15, atY - 4, pageWidth - 30, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 17, atY);
  doc.text('Qty', pageWidth - 75, atY, { align: 'right' });
  doc.text('Price', pageWidth - 50, atY, { align: 'right' });
  doc.text('Amount', pageWidth - 17, atY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  return atY + 8;
};
```

**Step 3:** Add page break checks before each section. Insert `y = checkPageBreak(y, <height>)` before every content block:

Before the Bill To section (around line 852):
```typescript
y = checkPageBreak(y, 40); // Bill To needs ~40pt minimum
```

**Step 4:** Replace the table header code (lines 882-891) with a call to the helper:

```typescript
// Table Header
y = checkPageBreak(y, 16); // Header + at least one row
y = drawTableHeader(y);
```

**Step 5:** Modify the line items forEach loop (lines 897-910) to check page breaks and redraw headers:

```typescript
// Table Body
doc.setFont('helvetica', 'normal');
const invoiceCurrency = clients.find((c) => c.id === invoice.clientId)?.currency || 'EUR';
const currencySymbol = CURRENCY_SYMBOLS[invoiceCurrency] || '€';
invoice.lineItems.forEach((item) => {
  // Check if we need a new page for this line item
  const prevY = y;
  y = checkPageBreak(y, 6);
  if (y < prevY) {
    // Page break occurred — redraw table header on new page
    y = drawTableHeader(y);
  }

  doc.setFontSize(9);
  doc.text(item.description.substring(0, 50), 17, y);
  doc.text(item.quantity.toString(), pageWidth - 75, y, { align: 'right' });
  doc.text(`${currencySymbol}${item.unitPrice.toFixed(2)}`, pageWidth - 50, y, {
    align: 'right',
  });
  doc.text(
    `${currencySymbol}${(item.quantity * item.unitPrice).toFixed(2)}`,
    pageWidth - 17,
    y,
    { align: 'right' },
  );
  y += 6;
});
```

**Step 6:** Add page break checks before totals, notes, payment terms, and payment links:

Before totals (line 912):
```typescript
y = checkPageBreak(y, 30); // Totals need ~30pt
```

Before notes (line 937):
```typescript
if (invoice.notes) {
  const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - 30);
  const noteHeight = noteLines.length * 4 + 15;
  y = checkPageBreak(y, noteHeight);
  // ... rest of notes code unchanged
}
```

Before payment terms (line 951):
```typescript
if (settings?.paymentTerms) {
  const termLines = doc.splitTextToSize(settings.paymentTerms, pageWidth - 30);
  const termHeight = termLines.length * 4 + 15;
  y = checkPageBreak(y, termHeight);
  // ... rest of payment terms code unchanged
}
```

Inside `drawLink` function (line 964), add at the start:
```typescript
const drawLink = (label: string, url: string) => {
  y = checkPageBreak(y, 20); // Each link needs ~20pt
  // ... rest unchanged
};
```

**Step 7:** Replace the footer code (lines 988-992) to render on ALL pages:

```typescript
// Footer on all pages
const totalPages = doc.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Generated by FlowForge-Track', pageWidth / 2, pageHeight - 10, {
    align: 'center',
  });
  doc.setTextColor(0, 0, 0); // Reset text color
}
```

**Remove** the old `const pageHeight = doc.internal.pageSize.getHeight();` at line 989 (now defined at top).

**Acceptance criteria:**
- [ ] Invoice with 5 line items exports as single-page PDF (no regression)
- [ ] Invoice with 25+ line items exports as multi-page PDF
- [ ] Table header (Description/Qty/Price/Amount) redraws on each new page
- [ ] Totals, notes, and payment terms appear on correct page (not cut off)
- [ ] Footer "Generated by FlowForge-Track" appears on every page
- [ ] `pnpm build` passes

---

### Task 1.2: Modal Scroll Fix

**Problem:** When modal content exceeds viewport height, it's cut off because the content div has no scroll capability. The body's `overflow: hidden` prevents background scroll but the modal itself can't scroll.

**File to modify:** `src/components/ui/Modal.tsx`

**Current code (line 80-108):**
```tsx
<div
  ref={contentRef}
  tabIndex={-1}
  className={clsx(
    'w-full mx-4 bg-background rounded-xl shadow-xl border border-border',
    'animate-in fade-in zoom-in-95 duration-200',
    sizes[size],
  )}
>
  {/* Header */}
  {(title || showCloseButton) && (
    <div className='flex items-center justify-between px-6 py-4 border-b border-border'>
      ...
    </div>
  )}

  {/* Content */}
  <div className='px-6 py-4'>{children}</div>
</div>
```

**Replace the modal container div (lines 80-109) with:**

```tsx
<div
  ref={contentRef}
  tabIndex={-1}
  className={clsx(
    'w-full mx-4 bg-background rounded-xl shadow-xl border border-border',
    'animate-in fade-in zoom-in-95 duration-200',
    'max-h-[90vh] flex flex-col',
    sizes[size],
  )}
>
  {/* Header */}
  {(title || showCloseButton) && (
    <div className='flex items-center justify-between px-6 py-4 border-b border-border shrink-0'>
      {title && <h2 className='text-lg font-semibold text-foreground'>{title}</h2>}
      {showCloseButton && (
        <Button
          variant='ghost'
          size='sm'
          onClick={onClose}
          className='ml-auto -mr-2'
          aria-label='Close'
        >
          <X className='w-5 h-5' />
        </Button>
      )}
    </div>
  )}

  {/* Content — scrollable */}
  <div className='px-6 py-4 overflow-y-auto flex-1 min-h-0'>{children}</div>
</div>
```

**Key changes:**
1. Added `max-h-[90vh] flex flex-col` to outer container
2. Added `shrink-0` to header div (header stays fixed)
3. Changed content div to `overflow-y-auto flex-1 min-h-0` (content scrolls)

**Acceptance criteria:**
- [ ] Short modals (e.g., ConfirmDialog) render normally with no visible scrollbar
- [ ] Invoice preview modal with many line items shows scrollbar and all content is accessible
- [ ] Create Invoice modal (3 steps) scrolls properly on each step
- [ ] Header with title and close button stays visible while scrolling
- [ ] ESC key and backdrop click still close the modal
- [ ] `pnpm build` passes

---

**Phase 1 Gate:**
```bash
pnpm build && pnpm test
```

**Commit:**
```bash
git add src/features/invoices/InvoicesList.tsx src/components/ui/Modal.tsx
git commit -m "fix: PDF multi-page pagination and modal scroll overflow"
```

---

## Phase 2: Audit Fixes

### Task 2.1: Console.log Cleanup

**Problem:** 40+ `console.log` statements across production code. The app has a proper logger system at `src/lib/logger.ts` with category loggers.

**Available loggers (from `src/lib/logger.ts`):**
- `dbLogger` — Database operations
- `clientLogger` — Client operations
- `projectLogger` — Project operations
- `timeEntryLogger` — Time entry operations
- `invoiceLogger` — Invoice operations (already imported in InvoicesList.tsx)
- `uiLogger` — UI/general operations

**First, add two new category loggers to `src/lib/logger.ts`** (append after `uiLogger`):

```typescript
export const shortcutLogger = {
  debug: (msg: string, data?: unknown) => logger.debug('Shortcut', msg, data),
  info: (msg: string, data?: unknown) => logger.info('Shortcut', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('Shortcut', msg, data),
  error: (msg: string, err?: Error | unknown, data?: unknown) =>
    logger.error('Shortcut', msg, err, data),
};

export const backupLogger = {
  debug: (msg: string, data?: unknown) => logger.debug('Backup', msg, data),
  info: (msg: string, data?: unknown) => logger.info('Backup', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('Backup', msg, data),
  error: (msg: string, err?: Error | unknown, data?: unknown) =>
    logger.error('Backup', msg, err, data),
};
```

**Then replace console.log/console.error in each file:**

| File | Replace | With | Import |
|------|---------|------|--------|
| `src/components/IdleMonitor.tsx` | `console.log('[IdleMonitor] ...')` | `uiLogger.debug('...')` | `import { uiLogger } from '../lib/logger'` |
| `src/components/IdleDialog.tsx` | All `console.log('[IdleDialog] ...')` | `uiLogger.debug('...')` | `import { uiLogger } from '../lib/logger'` |
| `src/features/clients/ClientsList.tsx` | `console.log(...)` and `console.error(...)` | `clientLogger.debug(...)` / `clientLogger.error(...)` | `import { clientLogger } from '../../lib/logger'` |
| `src/features/projects/ProjectsList.tsx` | `console.log(...)` and `console.error(...)` | `projectLogger.debug(...)` / `projectLogger.error(...)` | `import { projectLogger } from '../../lib/logger'` |
| `src/features/timer/TimerSync.tsx` | `console.log(...)` | `uiLogger.debug(...)` | `import { uiLogger } from '../../lib/logger'` |
| `src/features/timer/TimerView.tsx` | `console.log(...)` | `timeEntryLogger.debug(...)` | `import { timeEntryLogger } from '../../lib/logger'` |
| `src/features/time-entries/TimeEntriesList.tsx` | `console.error('Failed to load data:', err)` | `timeEntryLogger.error('Failed to load data', err)` | `import { timeEntryLogger } from '../../lib/logger'` |
| `src/features/invoices/InvoicesList.tsx` | remaining `console.error(...)` calls (lines 75, 93, 104, 540, 1041) | `invoiceLogger.error(...)` | Already imported |
| `src/pages/Settings.tsx` | `console.log(...)` / `console.error(...)` | `uiLogger.debug(...)` / `uiLogger.error(...)` | `import { uiLogger } from '../lib/logger'` |
| `src/services/shortcutService.ts` | `console.log(...)` / `console.error(...)` | `shortcutLogger.debug(...)` / `shortcutLogger.error(...)` | `import { shortcutLogger } from '../lib/logger'` |
| `src/services/backupService.ts` | `console.log(...)` / `console.error(...)` | `backupLogger.debug(...)` / `backupLogger.error(...)` | `import { backupLogger } from '../lib/logger'` |
| `src/lib/widgetWindow.ts` | `console.log(...)` | `uiLogger.debug(...)` | `import { uiLogger } from './logger'` |
| `src/lib/migrations.ts` | `console.log(...)` | `dbLogger.info(...)` | `import { dbLogger } from './logger'` |
| `src/main.tsx` | `console.log(...)` | `dbLogger.info(...)` | `import { dbLogger } from './lib/logger'` |
| `src/features/dashboard/DashboardSummary.tsx` | `console.error(...)` | `uiLogger.error(...)` | `import { uiLogger } from '../../lib/logger'` |

**Note:** Keep `console.error` calls inside `ErrorBoundary.tsx` line 17 — that's a React lifecycle method where the logger might not be available.

**Also:** The commented-out `// console.log(...)` in IdleMonitor.tsx line 38 — just remove the comment entirely.

**Acceptance criteria:**
- [ ] `grep -r "console\.log" src/ --include="*.tsx" --include="*.ts" | grep -v "logger.ts" | grep -v "node_modules" | grep -v "ErrorBoundary"` returns zero results
- [ ] Logger still outputs to browser console during development (enableConsole: true by default)
- [ ] `pnpm build` passes

---

### Task 2.2: @ts-ignore Removal

**Files to modify:**
- `src/features/clients/ClientForm.tsx` (lines 38-40)
- `src/features/projects/ProjectForm.tsx` (line 51)

In both files, look for patterns like:
```typescript
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — deliberate reset pattern
setFormData({ ... });
```

**Remove** the `@ts-ignore` comment and the `@typescript-eslint/ban-ts-comment` disable comment. Keep only the eslint-disable if needed:
```typescript
// eslint-disable-next-line react-hooks/set-state-in-effect
setFormData({ ... });
```

If the ESLint rule doesn't exist in the config, just remove all the suppression comments entirely.

**Acceptance criteria:**
- [ ] No `@ts-ignore` comments in either file
- [ ] `pnpm build` passes (no TypeScript errors introduced)

---

### Task 2.3: IdleDialog Refactor to Modal

**Problem:** `IdleDialog` renders a raw `<div className='fixed inset-0...'>` overlay instead of using the `Modal` component that every other dialog in the app uses.

**File to modify:** `src/components/IdleDialog.tsx`

**Replace the return statement (lines 110-141) with:**

```tsx
return (
  <Modal isOpen={true} onClose={onClose} title='Welcome Back!' size='sm'>
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <div className='p-3 bg-amber-500/10 rounded-full'>
          <Clock className='w-6 h-6 text-amber-600 dark:text-amber-400' />
        </div>
        <p className='text-sm text-muted-foreground'>
          You were away for {formatDuration(idleDuration)}
        </p>
      </div>

      <p className='text-sm'>
        Your timer was paused while you were away. What would you like to do with this time?
      </p>

      <div className='space-y-2'>
        <Button onClick={handleDiscard} variant='outline' className='w-full justify-start gap-3'>
          <Trash2 className='w-4 h-4' />
          Discard idle time
        </Button>
        <Button onClick={handleKeepAll} variant='outline' className='w-full justify-start gap-3'>
          <Check className='w-4 h-4' />
          Keep all time
        </Button>
      </div>
    </div>
  </Modal>
);
```

**Update imports:** Replace `import { Button, Card } from './ui'` with `import { Button, Modal } from './ui'` (remove `Card`, add `Modal`).

**All business logic (refs, store manipulation, event emission) stays exactly the same.** Only the JSX wrapper changes from raw div+Card to Modal.

**Acceptance criteria:**
- [ ] IdleDialog uses `<Modal>` component
- [ ] `Card` import removed from IdleDialog.tsx
- [ ] Idle detection still works: timer pauses after 5 minutes idle, dialog shows on return
- [ ] "Discard idle time" and "Keep all time" buttons work correctly
- [ ] ESC key and backdrop click close the dialog
- [ ] `pnpm build` passes

---

### Task 2.4: ErrorBoundary Coverage

**Problem:** `ErrorBoundary` exists but isn't wrapped around the main content area. Only `ProjectsList` uses it.

**File to modify:** `src/components/layout/Layout.tsx`

**Step 1:** Add import at top:
```typescript
import { ErrorBoundary } from '../ui/ErrorBoundary';
```

**Step 2:** Wrap `<Outlet />` in ErrorBoundary. Change:
```tsx
<main className='flex-1 overflow-auto p-8'>
  <div className='page-enter'>
    <Outlet />
  </div>
</main>
```

To:
```tsx
<main className='flex-1 overflow-auto p-8'>
  <ErrorBoundary name='page-content'>
    <div className='page-enter'>
      <Outlet />
    </div>
  </ErrorBoundary>
</main>
```

**Step 3:** Add a recovery button to ErrorBoundary. Modify `src/components/ui/ErrorBoundary.tsx` render method — after the `<pre>` tag (line 36), add:

```tsx
<button
  onClick={() => this.setState({ hasError: false, error: null })}
  className='mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity'
>
  Try Again
</button>
```

**Acceptance criteria:**
- [ ] Layout.tsx imports and wraps Outlet in ErrorBoundary
- [ ] ErrorBoundary has a "Try Again" button that resets the error state
- [ ] If a page component throws, the error boundary catches it (not a white screen)
- [ ] `pnpm build` passes

---

**Phase 2 Gate:**
```bash
pnpm build && pnpm test
```

**Commit:**
```bash
git add -A
git commit -m "refactor: console.log cleanup, ts-ignore removal, IdleDialog modal, ErrorBoundary"
```

---

## Phase 3: Accessibility — Modal ARIA Compliance

### Task 3.1: Full ARIA Compliance for Modal

**File to modify:** `src/components/ui/Modal.tsx`

This task builds on Task 1.2's changes. Apply these additions to the already-modified Modal.

**Step 1:** Add `useId` import and generate a title ID:

```typescript
import { useEffect, useRef, useId, type ReactNode } from 'react';
```

Inside the Modal function, add:
```typescript
const modalTitleId = useId();
const previouslyFocusedRef = useRef<HTMLElement | null>(null);
```

**Step 2:** Add ARIA attributes to the modal container div:

```tsx
<div
  ref={contentRef}
  tabIndex={-1}
  role='dialog'
  aria-modal='true'
  aria-labelledby={title ? modalTitleId : undefined}
  className={clsx(
    'w-full mx-4 bg-background rounded-xl shadow-xl border border-border',
    'animate-in fade-in zoom-in-95 duration-200',
    'max-h-[90vh] flex flex-col',
    sizes[size],
  )}
>
```

**Step 3:** Add `id` to the title element:

```tsx
{title && <h2 id={modalTitleId} className='text-lg font-semibold text-foreground'>{title}</h2>}
```

**Step 4:** Replace the existing focus effect (lines 59-63) with focus trap + focus restoration:

```typescript
// Save previously focused element and restore on close
useEffect(() => {
  if (isOpen) {
    previouslyFocusedRef.current = document.activeElement as HTMLElement;
  } else if (previouslyFocusedRef.current) {
    previouslyFocusedRef.current.focus();
    previouslyFocusedRef.current = null;
  }
}, [isOpen]);

// Focus trap: Tab cycles within modal
useEffect(() => {
  if (!isOpen || !contentRef.current) return;

  // Initial focus
  contentRef.current.focus();

  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !contentRef.current) return;

    const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  document.addEventListener('keydown', handleTab);
  return () => document.removeEventListener('keydown', handleTab);
}, [isOpen]);
```

**Acceptance criteria:**
- [ ] Modal has `role="dialog"` and `aria-modal="true"`
- [ ] Modal has `aria-labelledby` pointing to the title when title is provided
- [ ] Tab key cycles within modal focusable elements (doesn't escape to background)
- [ ] Shift+Tab cycles backwards
- [ ] When modal closes, focus returns to the element that opened it
- [ ] ESC key still closes the modal
- [ ] `pnpm build` passes

---

**Phase 3 Gate:**
```bash
pnpm build && pnpm test
```

**Commit:**
```bash
git add src/components/ui/Modal.tsx
git commit -m "feat: full ARIA compliance for Modal (focus trap, roles, restoration)"
```

---

## Phase 4: Functionality Improvements

### Task 4.1: CSV Export

**New file:** `src/lib/exportUtils.ts`

```typescript
/**
 * CSV generation and file download utilities.
 * Uses Tauri save dialog when available, browser blob fallback otherwise.
 */

export function generateCSV(headers: string[], rows: string[][]): string {
  const escape = (val: string): string => {
    // Wrap in quotes if contains comma, newline, or quote
    if (val.includes(',') || val.includes('\n') || val.includes('"')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerLine = headers.map(escape).join(',');
  const dataLines = rows.map((row) => row.map(escape).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export async function downloadCSV(filename: string, csvContent: string): Promise<void> {
  const isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window;

  if (isTauri) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');

    const filePath = await save({
      defaultPath: filename,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    });

    if (filePath) {
      await writeTextFile(filePath, csvContent);
    }
  } else {
    // Browser fallback
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
```

**Modify:** `src/features/time-entries/TimeEntriesList.tsx`

Add import:
```typescript
import { Download } from 'lucide-react';
import { generateCSV, downloadCSV } from '../../lib/exportUtils';
import { uiLogger } from '../../lib/logger';
```

Add export handler inside the component:
```typescript
const handleExportCSV = async () => {
  try {
    const headers = ['Date', 'Project', 'Client', 'Start', 'End', 'Duration', 'Billable', 'Billed', 'Notes'];
    const rows = filteredEntries.map((entry) => [
      new Date(entry.startTime).toLocaleDateString(),
      entry.projectName || '',
      entry.clientName || '',
      new Date(entry.startTime).toLocaleTimeString(),
      entry.endTime ? new Date(entry.endTime).toLocaleTimeString() : '',
      entry.endTime ? formatDurationShort(calculateDuration(entry.startTime, entry.endTime, entry.pauseDuration)) : '',
      entry.isBillable ? 'Yes' : 'No',
      entry.isBilled ? 'Yes' : 'No',
      entry.notes || '',
    ]);

    const csv = generateCSV(headers, rows);
    await downloadCSV(`time-entries-${new Date().toISOString().split('T')[0]}.csv`, csv);
  } catch (error) {
    uiLogger.error('Failed to export CSV', error);
  }
};
```

Add an "Export CSV" button next to the filter area in the header:
```tsx
<Button variant='outline' size='sm' onClick={handleExportCSV} disabled={filteredEntries.length === 0}>
  <Download className='w-4 h-4' />
  Export CSV
</Button>
```

**Similarly for `src/features/invoices/InvoicesList.tsx`:**

Add the same imports and a handler:
```typescript
const handleExportCSV = async () => {
  try {
    const headers = ['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Status', 'Subtotal', 'Tax', 'Total'];
    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      inv.clientName,
      new Date(inv.issueDate).toLocaleDateString(),
      new Date(inv.dueDate).toLocaleDateString(),
      inv.status,
      inv.subtotal.toFixed(2),
      inv.taxAmount.toFixed(2),
      inv.total.toFixed(2),
    ]);

    const csv = generateCSV(headers, rows);
    await downloadCSV(`invoices-${new Date().toISOString().split('T')[0]}.csv`, csv);
  } catch (error) {
    invoiceLogger.error('Failed to export CSV', error);
  }
};
```

Add button in the header area (next to "New Invoice"):
```tsx
<Button variant='outline' size='sm' onClick={handleExportCSV} disabled={invoices.length === 0}>
  <Download className='w-4 h-4' />
  Export CSV
</Button>
```

**Acceptance criteria:**
- [ ] "Export CSV" button visible in Time Entries and Invoices pages
- [ ] Clicking export opens save dialog (Tauri) or downloads file (browser)
- [ ] CSV content is properly escaped (commas, quotes, newlines in data)
- [ ] Exported CSV opens correctly in Excel/Google Sheets
- [ ] Button disabled when no entries to export
- [ ] `pnpm build` passes

---

### Task 4.2: Toast System + Undo Last Timer Stop

**New file:** `src/stores/toastStore.ts`

```typescript
import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number; // ms, default 10000
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));
```

**New file:** `src/components/ui/Toast.tsx`

```tsx
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <div className='fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm'>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: { id: string; message: string; action?: { label: string; onClick: () => void }; duration?: number };
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration || 10000);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  return (
    <div className='bg-foreground text-background px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom duration-200'>
      <span className='text-sm flex-1'>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            onDismiss();
          }}
          className='text-sm font-medium text-primary-foreground bg-primary px-3 py-1 rounded-md hover:opacity-90 transition-opacity shrink-0'
        >
          {toast.action.label}
        </button>
      )}
      <button onClick={onDismiss} className='opacity-60 hover:opacity-100 shrink-0' aria-label='Dismiss'>
        <X className='w-4 h-4' />
      </button>
    </div>
  );
}
```

**Export from barrel:** Add to `src/components/ui/index.ts`:
```typescript
export { ToastContainer } from './Toast';
```

**Mount ToastContainer globally.** In `src/App.tsx`, inside `AppContent` component, add before `</>`  closing fragment:

```tsx
import { ToastContainer } from './components/ui/Toast';

// Inside AppContent return:
<>
  <IdleMonitor />
  <BrowserRouter>
    ...
  </BrowserRouter>
  <ToastContainer />
</>
```

**Now implement Undo Last Stop.** Modify `src/stores/timerStore.ts`:

Add to the interface:
```typescript
interface TimerStore {
  // ... existing fields ...

  // Undo support
  lastStoppedState: {
    projectId: string;
    projectName: string;
    projectColor: string;
    startTime: string;
    accumulatedPauseDuration: number;
  } | null;

  undoStop: () => boolean; // Returns true if undo was successful
  clearLastStopped: () => void;
}
```

Modify the `stop` action to save state before resetting:

```typescript
stop: () => {
  const { state, projectId, projectName, projectColor, startTime, pauseStartTime, accumulatedPauseDuration } = get();
  if (state === 'idle' || !projectId || !startTime) return null;

  let totalPauseDuration = accumulatedPauseDuration;
  if (state === 'paused' && pauseStartTime) {
    const pauseEnd = Date.now();
    const pauseStart = new Date(pauseStartTime).getTime();
    totalPauseDuration += (pauseEnd - pauseStart) / 1000;
  }

  const result = {
    projectId,
    startTime,
    pauseDuration: Math.round(totalPauseDuration),
  };

  // Save state for undo before resetting
  set({
    lastStoppedState: {
      projectId: projectId!,
      projectName: projectName!,
      projectColor: projectColor!,
      startTime: startTime!,
      accumulatedPauseDuration,
    },
    state: 'idle',
    projectId: null,
    projectName: null,
    projectColor: null,
    startTime: null,
    pauseStartTime: null,
    accumulatedPauseDuration: 0,
  });

  return result;
},
```

Add the new actions:
```typescript
undoStop: () => {
  const { lastStoppedState } = get();
  if (!lastStoppedState) return false;

  set({
    state: 'running',
    projectId: lastStoppedState.projectId,
    projectName: lastStoppedState.projectName,
    projectColor: lastStoppedState.projectColor,
    startTime: lastStoppedState.startTime,
    pauseStartTime: null,
    accumulatedPauseDuration: lastStoppedState.accumulatedPauseDuration,
    lastStoppedState: null,
  });

  return true;
},

clearLastStopped: () => {
  set({ lastStoppedState: null });
},
```

Add `lastStoppedState: null` to the initial state and to the `reset` action.

Add `lastStoppedState` to the `partialize` in the persist config so it survives a page reload.

**Show the undo toast when timer stops.** In `src/features/timer/TimerView.tsx`, find where `stop()` is called and add after it:

```typescript
import { useToastStore } from '../../stores/toastStore';

// Inside the component:
const addToast = useToastStore((state) => state.addToast);
const undoStop = useTimerStore((state) => state.undoStop);

// After calling stop():
addToast({
  message: 'Timer stopped',
  action: {
    label: 'Undo',
    onClick: () => {
      const restored = undoStop();
      if (restored) {
        // Timer is running again — the UI will update automatically via Zustand
      }
    },
  },
  duration: 10000,
});
```

**Also clear lastStoppedState when a new timer starts.** In the `start` action of timerStore, add `lastStoppedState: null` to the set() call.

**Acceptance criteria:**
- [ ] Toast notification appears at bottom-right when timer is stopped
- [ ] Toast shows "Timer stopped" with "Undo" button
- [ ] Clicking "Undo" restores the timer to running state with correct elapsed time
- [ ] Toast auto-dismisses after 10 seconds
- [ ] Starting a new timer clears the undo state
- [ ] `pnpm build` passes

---

### Task 4.3: Time Entry Bulk Actions

**File to modify:** `src/features/time-entries/TimeEntriesList.tsx`

The component already has `selectedIds` (Set<string>) and `deletingEntries` state. Wire up the UI.

**Step 1:** Add bulk action service methods to `src/services/timeEntryService.ts`:

```typescript
// Add to the timeEntryService object:

async bulkDelete(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await db.execute(`DELETE FROM time_entries WHERE id IN (${placeholders})`, ids);
  timeEntryLogger.info('Bulk deleted time entries', { count: ids.length });
},

async bulkUpdateBillable(ids: string[], isBillable: boolean): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await db.execute(
    `UPDATE time_entries SET is_billable = ?, updated_at = ? WHERE id IN (${placeholders})`,
    [isBillable ? 1 : 0, now(), ...ids],
  );
  timeEntryLogger.info('Bulk updated billable status', { count: ids.length, isBillable });
},

async bulkUpdateBilled(ids: string[], isBilled: boolean): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await db.execute(
    `UPDATE time_entries SET is_billed = ?, updated_at = ? WHERE id IN (${placeholders})`,
    [isBilled ? 1 : 0, now(), ...ids],
  );
  timeEntryLogger.info('Bulk updated billed status', { count: ids.length, isBilled });
},
```

**Step 2:** Add selection UI to `TimeEntriesList.tsx`. Add a toggle handler:

```typescript
const toggleSelect = (id: string) => {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const toggleSelectAll = () => {
  if (selectedIds.size === filteredEntries.length) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(filteredEntries.map((e) => e.id)));
  }
};

const handleBulkDelete = async () => {
  setSubmitting(true);
  try {
    await timeEntryService.bulkDelete([...selectedIds]);
    setSelectedIds(new Set());
    await loadData();
  } catch (error) {
    timeEntryLogger.error('Bulk delete failed', error);
  } finally {
    setSubmitting(false);
  }
};

const handleBulkBillable = async (isBillable: boolean) => {
  try {
    await timeEntryService.bulkUpdateBillable([...selectedIds], isBillable);
    setSelectedIds(new Set());
    await loadData();
  } catch (error) {
    timeEntryLogger.error('Bulk update billable failed', error);
  }
};

const handleBulkBilled = async (isBilled: boolean) => {
  try {
    await timeEntryService.bulkUpdateBilled([...selectedIds], isBilled);
    setSelectedIds(new Set());
    await loadData();
  } catch (error) {
    timeEntryLogger.error('Bulk update billed failed', error);
  }
};
```

**Step 3:** Add "Select All" checkbox and bulk action bar in the UI. Add this before the entries list rendering:

```tsx
{/* Bulk action bar */}
{filteredEntries.length > 0 && (
  <div className='flex items-center gap-3'>
    <label className='flex items-center gap-2 text-sm cursor-pointer'>
      <input
        type='checkbox'
        checked={selectedIds.size === filteredEntries.length && filteredEntries.length > 0}
        onChange={toggleSelectAll}
        className='rounded border-border'
      />
      Select All
    </label>
    {selectedIds.size > 0 && (
      <div className='flex items-center gap-2 ml-4'>
        <Badge>{selectedIds.size} selected</Badge>
        <Button variant='outline' size='sm' onClick={() => handleBulkBillable(true)}>
          Mark Billable
        </Button>
        <Button variant='outline' size='sm' onClick={() => handleBulkBillable(false)}>
          Mark Non-Billable
        </Button>
        <Button variant='outline' size='sm' onClick={() => handleBulkBilled(true)}>
          Mark Billed
        </Button>
        <Button variant='destructive' size='sm' onClick={() => setDeletingEntries(filteredEntries.filter((e) => selectedIds.has(e.id)))}>
          <Trash2 className='w-4 h-4' />
          Delete ({selectedIds.size})
        </Button>
      </div>
    )}
  </div>
)}
```

**Step 4:** Add checkbox to each entry card. Inside each entry's Card component, add at the start:

```tsx
<input
  type='checkbox'
  checked={selectedIds.has(entry.id)}
  onChange={() => toggleSelect(entry.id)}
  className='rounded border-border shrink-0'
  aria-label={`Select entry ${entry.projectName}`}
/>
```

**Step 5:** Update the delete confirmation to handle bulk deletes. Modify the existing ConfirmDialog for `deletingEntries`:

```tsx
<ConfirmDialog
  isOpen={!!deletingEntries}
  onClose={() => setDeletingEntries(null)}
  onConfirm={async () => {
    if (!deletingEntries) return;
    setSubmitting(true);
    try {
      await timeEntryService.bulkDelete(deletingEntries.map((e) => e.id));
      setSelectedIds(new Set());
      await loadData();
      setDeletingEntries(null);
    } catch (error) {
      timeEntryLogger.error('Failed to delete entries', error);
    } finally {
      setSubmitting(false);
    }
  }}
  title='Delete Time Entries'
  message={`Are you sure you want to delete ${deletingEntries?.length || 0} time ${deletingEntries?.length === 1 ? 'entry' : 'entries'}?`}
  confirmLabel='Delete'
  variant='danger'
  loading={submitting}
/>
```

**Acceptance criteria:**
- [ ] "Select All" checkbox toggles all visible entries
- [ ] Individual checkboxes toggle entry selection
- [ ] Bulk action bar appears when entries are selected
- [ ] "Mark Billable/Non-Billable" updates entries and refreshes list
- [ ] "Mark Billed" updates entries and refreshes list
- [ ] "Delete" shows confirmation dialog with correct count
- [ ] Selections clear after any bulk action
- [ ] `pnpm build` passes

---

**Phase 4 Gate:**
```bash
pnpm build && pnpm test
```

**Commit:**
```bash
git add -A
git commit -m "feat: CSV export, undo last stop with toast, time entry bulk actions"
```

---

## Phase 5: UX Improvements

### Task 5.1: Loading Skeletons

**New file:** `src/components/ui/Skeleton.tsx`

```tsx
import clsx from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('shimmer rounded-lg', className)} />;
}

export function CardSkeleton() {
  return (
    <div className='p-4 bg-card border border-border rounded-xl space-y-3'>
      <Skeleton className='h-5 w-1/3' />
      <Skeleton className='h-4 w-2/3' />
      <Skeleton className='h-4 w-1/2' />
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className='space-y-3'>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
```

**Export from barrel:** Add to `src/components/ui/index.ts`:
```typescript
export { Skeleton, CardSkeleton, ListSkeleton } from './Skeleton';
```

**Replace spinner loading states in these files:**

Pattern to find:
```tsx
if (loading) {
  return (
    <div className='flex items-center justify-center h-64'>
      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' />
    </div>
  );
}
```

Replace with:
```tsx
import { ListSkeleton } from '../../components/ui';

if (loading) {
  return <ListSkeleton />;
}
```

**Files to update:**
- `src/features/invoices/InvoicesList.tsx` (lines 128-134)
- `src/features/clients/ClientsList.tsx` (find the loading spinner)
- `src/features/projects/ProjectsList.tsx` (find the loading spinner)
- `src/features/time-entries/TimeEntriesList.tsx` (find the loading spinner)
- `src/features/dashboard/DashboardSummary.tsx` (find the loading spinner)

**Acceptance criteria:**
- [ ] All list pages show shimmer skeletons instead of spinners while loading
- [ ] Shimmer animation is smooth and visible
- [ ] Skeleton layout roughly matches the actual content layout
- [ ] `pnpm build` passes

---

### Task 5.2: Keyboard Shortcuts Help Overlay

**New file:** `src/components/ui/KeyboardShortcutsDialog.tsx`

```tsx
import { Modal } from './Modal';
import { Keyboard } from 'lucide-react';

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const mod = isMac ? '⌘' : 'Ctrl';

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Timer',
    shortcuts: [
      { keys: [mod, 'Shift', 'S'], description: 'Start / Resume timer' },
      { keys: [mod, 'Shift', 'P'], description: 'Pause timer' },
      { keys: [mod, 'Shift', 'X'], description: 'Stop timer and save' },
    ],
  },
  {
    title: 'App',
    shortcuts: [
      { keys: [mod, 'Shift', 'W'], description: 'Toggle floating widget' },
      { keys: [mod, 'Shift', 'M'], description: 'Toggle sound notifications' },
      { keys: [mod, 'K'], description: 'Open global search' },
    ],
  },
  {
    title: 'Dialogs',
    shortcuts: [
      { keys: ['Esc'], description: 'Close modal / dialog' },
      { keys: ['?'], description: 'Show this help' },
    ],
  },
];

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title='Keyboard Shortcuts' size='md'>
      <div className='space-y-6'>
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className='text-sm font-semibold text-muted-foreground mb-2'>{group.title}</h3>
            <div className='space-y-2'>
              {group.shortcuts.map((shortcut) => (
                <div key={shortcut.description} className='flex items-center justify-between'>
                  <span className='text-sm'>{shortcut.description}</span>
                  <div className='flex items-center gap-1'>
                    {shortcut.keys.map((key, i) => (
                      <span key={i}>
                        <kbd className='px-2 py-1 text-xs font-mono bg-secondary border border-border rounded-md'>
                          {key}
                        </kbd>
                        {i < shortcut.keys.length - 1 && <span className='mx-0.5 text-muted-foreground'>+</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
```

**Export from barrel:** Add to `src/components/ui/index.ts`:
```typescript
export { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
```

**Register `?` key listener.** In `src/App.tsx`, add state and listener inside `AppContent`:

```typescript
import { KeyboardShortcutsDialog } from './components/ui/KeyboardShortcutsDialog';

// Inside AppContent:
const [showShortcuts, setShowShortcuts] = useState(false);

useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    // Only trigger on '?' when not in an input/textarea
    if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault();
      setShowShortcuts(true);
    }
  };
  document.addEventListener('keydown', handleKey);
  return () => document.removeEventListener('keydown', handleKey);
}, []);

// In the JSX return, before </> closing:
<KeyboardShortcutsDialog isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
```

Add `useState` to the existing React import if not already there.

**Acceptance criteria:**
- [ ] Pressing `?` key opens the shortcuts dialog
- [ ] Pressing `?` while typing in an input field does NOT open the dialog
- [ ] All shortcuts are displayed with correct key combinations
- [ ] Mac shows ⌘, Windows/Linux shows Ctrl
- [ ] ESC closes the dialog
- [ ] `pnpm build` passes

---

### Task 5.3: Global Search (Cmd+K)

**New file:** `src/hooks/useGlobalSearch.ts`

```typescript
import { useState, useEffect, useMemo, useCallback } from 'react';
import { clientService, projectService, invoiceService, timeEntryService } from '../services';
import type { Client, Project } from '../types';

export interface SearchResult {
  id: string;
  type: 'client' | 'project' | 'invoice' | 'time-entry';
  title: string;
  subtitle?: string;
  route: string;
}

export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<{ id: string; invoiceNumber: string; clientName: string; status: string }[]>([]);

  // Load all data once when search opens
  useEffect(() => {
    if (!isOpen) return;

    Promise.all([
      clientService.getAll(),
      projectService.getAll(),
      invoiceService.getAll(),
    ]).then(([c, p, i]) => {
      setClients(c);
      setProjects(p);
      setInvoices(i.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        status: inv.status,
      })));
    });
  }, [isOpen]);

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const matches: SearchResult[] = [];

    // Search clients
    clients.forEach((c) => {
      if (c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)) {
        matches.push({
          id: c.id,
          type: 'client',
          title: c.name,
          subtitle: c.email || undefined,
          route: '/clients',
        });
      }
    });

    // Search projects
    projects.forEach((p) => {
      if (p.name.toLowerCase().includes(q)) {
        matches.push({
          id: p.id,
          type: 'project',
          title: p.name,
          subtitle: p.description || undefined,
          route: '/projects',
        });
      }
    });

    // Search invoices
    invoices.forEach((i) => {
      if (i.invoiceNumber.toLowerCase().includes(q) || i.clientName.toLowerCase().includes(q)) {
        matches.push({
          id: i.id,
          type: 'invoice',
          title: i.invoiceNumber,
          subtitle: `${i.clientName} — ${i.status}`,
          route: '/invoices',
        });
      }
    });

    return matches.slice(0, 20); // Limit results
  }, [query, clients, projects, invoices]);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  return { query, setQuery, isOpen, open, close, results };
}
```

**Modify `src/components/layout/Header.tsx`:**

Replace the entire file:

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, FolderKanban, FileText, X } from 'lucide-react';
import { useGlobalSearch, type SearchResult } from '../../hooks/useGlobalSearch';

const TYPE_ICONS: Record<string, typeof Users> = {
  client: Users,
  project: FolderKanban,
  invoice: FileText,
  'time-entry': FileText,
};

export function Header() {
  const navigate = useNavigate();
  const { query, setQuery, isOpen, open, close, results } = useGlobalSearch();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.route);
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      close();
    }
  };

  return (
    <header className='h-16 border-b border-border flex items-center px-8 bg-background shrink-0'>
      <h1 className='text-xl font-semibold'>FlowForge-Track</h1>

      <div className='ml-auto relative'>
        {/* Search trigger button */}
        <button
          onClick={open}
          className='flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors'
        >
          <Search className='w-4 h-4' />
          <span>Search...</span>
          <kbd className='ml-2 px-1.5 py-0.5 text-xs font-mono bg-background border border-border rounded'>
            {/Mac/.test(navigator.userAgent) ? '⌘' : 'Ctrl'}+K
          </kbd>
        </button>

        {/* Search overlay */}
        {isOpen && (
          <>
            <div className='fixed inset-0 bg-black/50 z-40' onClick={close} />
            <div className='fixed top-[20vh] left-1/2 -translate-x-1/2 w-full max-w-lg z-50'>
              <div className='bg-background border border-border rounded-xl shadow-xl overflow-hidden'>
                {/* Search input */}
                <div className='flex items-center gap-3 px-4 py-3 border-b border-border'>
                  <Search className='w-5 h-5 text-muted-foreground shrink-0' />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Search clients, projects, invoices...'
                    className='flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground'
                  />
                  {query && (
                    <button onClick={() => setQuery('')} className='text-muted-foreground hover:text-foreground'>
                      <X className='w-4 h-4' />
                    </button>
                  )}
                </div>

                {/* Results */}
                {query.trim() && (
                  <div className='max-h-64 overflow-y-auto'>
                    {results.length === 0 ? (
                      <div className='px-4 py-8 text-center text-sm text-muted-foreground'>
                        No results found
                      </div>
                    ) : (
                      results.map((result, index) => {
                        const Icon = TYPE_ICONS[result.type] || FileText;
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleSelect(result)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary transition-colors ${
                              index === selectedIndex ? 'bg-secondary' : ''
                            }`}
                          >
                            <Icon className='w-4 h-4 text-muted-foreground shrink-0' />
                            <div className='flex-1 min-w-0'>
                              <p className='text-sm font-medium truncate'>{result.title}</p>
                              {result.subtitle && (
                                <p className='text-xs text-muted-foreground truncate'>{result.subtitle}</p>
                              )}
                            </div>
                            <span className='text-xs text-muted-foreground capitalize shrink-0'>
                              {result.type.replace('-', ' ')}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className='px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground'>
                  <span><kbd className='px-1 bg-secondary rounded'>↑↓</kbd> Navigate</span>
                  <span><kbd className='px-1 bg-secondary rounded'>↵</kbd> Select</span>
                  <span><kbd className='px-1 bg-secondary rounded'>Esc</kbd> Close</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
```

**Acceptance criteria:**
- [ ] Cmd+K (Mac) / Ctrl+K (Windows/Linux) opens the search overlay
- [ ] Typing filters results across clients, projects, and invoices
- [ ] Arrow keys navigate results, Enter selects
- [ ] Selecting a result navigates to the correct page
- [ ] ESC or backdrop click closes the search
- [ ] Search trigger button visible in header with keyboard shortcut hint
- [ ] `pnpm build` passes

---

### Task 5.4: Undo for Destructive Actions

**Uses the Toast system from Task 4.2.**

**Pattern:** Instead of immediately executing a delete after the ConfirmDialog, use a delayed execution with toast-based undo.

**Create a shared hook.** New file: `src/hooks/useUndoableAction.ts`

```typescript
import { useRef, useCallback } from 'react';
import { useToastStore } from '../stores/toastStore';

export function useUndoableAction() {
  const addToast = useToastStore((state) => state.addToast);
  const removeToast = useToastStore((state) => state.removeToast);
  const pendingRef = useRef<{ timeoutId: NodeJS.Timeout; toastId: string } | null>(null);

  const execute = useCallback(
    (options: {
      message: string;
      action: () => Promise<void>;
      onUndo?: () => void;
      delay?: number;
    }) => {
      const { message, action, onUndo, delay = 10000 } = options;

      // Set up delayed execution
      const timeoutId = setTimeout(async () => {
        pendingRef.current = null;
        await action();
      }, delay);

      // Show toast with undo option
      const toastId = addToast({
        message,
        action: onUndo
          ? {
              label: 'Undo',
              onClick: () => {
                if (pendingRef.current) {
                  clearTimeout(pendingRef.current.timeoutId);
                  pendingRef.current = null;
                }
                onUndo();
              },
            }
          : undefined,
        duration: delay,
      });

      pendingRef.current = { timeoutId, toastId };
    },
    [addToast],
  );

  return { execute };
}
```

**Apply to client deletes in `src/features/clients/ClientsList.tsx`:**

Where the delete is confirmed (after ConfirmDialog's onConfirm), instead of immediately calling `clientService.delete()`, use the undoable pattern:

```typescript
import { useUndoableAction } from '../../hooks/useUndoableAction';

// Inside the component:
const { execute: executeUndoable } = useUndoableAction();

// In the onConfirm handler:
const handleDeleteClient = () => {
  if (!deletingClient) return;
  const clientToDelete = deletingClient;
  setDeletingClient(null);

  // Optimistically remove from UI
  setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));

  // Delayed actual delete with undo
  executeUndoable({
    message: `Deleted client "${clientToDelete.name}"`,
    action: async () => {
      await clientService.delete(clientToDelete.id);
    },
    onUndo: () => {
      // Restore to UI (reload from DB)
      loadData();
    },
  });
};
```

Apply the same pattern to:
- `src/features/projects/ProjectsList.tsx` — project deletes
- `src/features/invoices/InvoicesList.tsx` — invoice deletes
- `src/features/time-entries/TimeEntriesList.tsx` — single entry deletes (bulk already has confirm)

**Acceptance criteria:**
- [ ] Deleting a client shows "Deleted client 'X'" toast with Undo button
- [ ] Clicking Undo before 10s restores the item (reloads from DB)
- [ ] After 10s, the item is actually deleted from the database
- [ ] Same pattern works for projects, invoices, and single time entries
- [ ] `pnpm build` passes

---

**Phase 5 Gate:**
```bash
pnpm build && pnpm test
```

**Commit:**
```bash
git add -A
git commit -m "feat: loading skeletons, keyboard shortcuts help, global search, undo actions"
```

---

## Final Verification Checklist

Run all of these after all phases are complete:

```bash
# Build must pass
pnpm build

# Tests must pass
pnpm test

# No console.log in production code
grep -r "console\.log" src/ --include="*.tsx" --include="*.ts" | grep -v "logger.ts" | grep -v "node_modules" | grep -v "ErrorBoundary" | wc -l
# Expected: 0

# No @ts-ignore
grep -r "@ts-ignore" src/ --include="*.tsx" --include="*.ts" | wc -l
# Expected: 0
```

**Manual verification (if running the app):**
- [ ] Create an invoice with 25+ line items, export PDF — should span multiple pages
- [ ] Open invoice preview with many items — modal scrolls, header stays fixed
- [ ] Press `?` — keyboard shortcuts dialog opens
- [ ] Press `Cmd+K` — global search opens, type a client name, navigate with arrows, Enter to select
- [ ] Stop a running timer — toast appears with "Undo" button
- [ ] Delete a client — toast appears with "Undo", clicking undo restores the client
- [ ] Navigate to Time Entries — select multiple entries, bulk delete/mark billable works
- [ ] Export CSV from Time Entries and Invoices pages
- [ ] All pages show skeleton loading states (not spinners)
- [ ] Idle detection still works (timer pauses, dialog shows on return)

---

## Summary

| Phase | Tasks | Type | Commit Message |
|-------|-------|------|----------------|
| 1 | 1.1, 1.2 | Bug fixes | `fix: PDF multi-page pagination and modal scroll overflow` |
| 2 | 2.1-2.4 | Audit fixes | `refactor: console.log cleanup, ts-ignore removal, IdleDialog modal, ErrorBoundary` |
| 3 | 3.1 | Accessibility | `feat: full ARIA compliance for Modal (focus trap, roles, restoration)` |
| 4 | 4.1-4.3 | Features | `feat: CSV export, undo last stop with toast, time entry bulk actions` |
| 5 | 5.1-5.4 | UX | `feat: loading skeletons, keyboard shortcuts help, global search, undo actions` |

# Product Requirements Document: FlowForge-Track v0.1.3

## 📋 Overview
This document outlines the requirements for version `v0.1.3` of FlowForge-Track. The focus is on addressing initial user feedback, fixing critical bugs, refining the UI/UX, and implementing data management features (updates and backups).

**Development Strategy:**
- All changes must be developed on a new branch: `feat/v0.1.3-improvements`.
- Merging to `main` will trigger the GitHub release workflow.

---

## 🚨 1. Critical Bugs & Issues

### 1.1 Empty State & List Visibility
*   **Problem:** The invoice filter disappears if a selected filter returns no results (empty state). This forces the user to navigate away and back to reset the view.
*   **Problem (Deletion):** Deleting the last visible invoice causes the view to become inaccessible ("CAN'T SEE ANY").
*   **Solution:** Ensure the filter controls remain visible even when the invoice list is empty. Handle the "all items deleted" state gracefully without breaking the UI.

### 1.2 Input Glitches
*   **Problem:** Users cannot manually delete the leading "0" in number fields (e.g., Hourly Rate). It feels clunky.
*   **Solution:** Improve input handling for number fields to allow clearing the default value naturally.

---

## 💰 2. Invoicing & Billing Logic

### 2.1 Currency Support
*   **Feature:** Add an option to change currency per client or product.
*   **Requirement:** Default currency should remain Euro (€).
*   **Options:** Euro (€), Dollars ($), GBP (£).

### 2.2 Payment Terms
*   **Feature:** Allow editing of "Payment Terms" directly while creating/editing an invoice.
*   **Current Behavior:** Only editable in global settings.
*   **Solution:** Make the "Payment Terms" field an editable text area on the invoice form, pre-filled with the global default but overridable.

---

## 🎨 3. UI/UX & Design

### 3.1 Animations
*   **Problem:** The "translate" hover effects (jumping UI) are distracting for some users.
*   **Solution:** Add a toggle in Settings: "Disable UI Animations". When enabled, disable all hover translation effects.

### 3.2 Clarity
*   **Problem:** "Line Items" and "Reload Hours" fields are confusing.
*   **Solution:** Add clear labels or tooltip explainers to these fields to describe their function (e.g., "Add custom items to invoice" vs "Import tracked hours").

---

## ⚙️ 4. Settings & Accessibility

### 4.1 Themes
*   **Feature:** Add a "High Contrast" theme.
*   **Reference:** Similar to VS Code or Windows High Contrast mode for better accessibility.

### 4.2 Input Limits
*   **Feature:** Cap the maximum input value for number fields.
*   **Requirement:** Max value = `1,000,000` (1 million).
*   **Target Fields:** Client Hourly Rate, Product Item Price.
*   **Reason:** Prevent accidental inputs like "100 billion" from holding down a key.

---

## 💡 5. Feature Requests

### 5.1 Time Editing (Manual Adjustments)
*   **Feature:** Detailed editing for time entries.
*   **Requirement:**
    *   Allow users to manually edit the duration (add/remove minutes/hours) of existing time entries.
    *   **Critical:** Ensure manual time adjustments are correctly persisted to the database (updating the `duration`, `start_time`, or `end_time` as appropriate) so that subsequent invoice generation accurately reflects the billable hours and amount.
    *   Useful for correcting mistakes or manual adjustments.

---

## 🔄 6. App Update System

### 6.1 "New Version Available" Indicator
*   **Mechanism:**
    *   The app periodically checks a lightweight JSON file hosted on the GitHub repository (e.g., `https://raw.githubusercontent.com/EmminiX/FlowForge-Timetrack/main/latest.json`).
    *   Compare the version in `latest.json` with the current app version.
*   **UI:**
    *   If a newer version exists, show a notification/banner: "New version available".
    *   Provide a link to the GitHub Release page for the user to download the installer manually.
*   **Privacy:** This keeps the update process manual and privacy-conscious (no auto-install/tracking), while keeping users informed.

---

## 💾 7. Backup & Restore

### 7.1 Local Export (Backup)
*   **UI:** "Export Data" button in Settings.
*   **Process:**
    1.  User clicks "Export Backup".
    2.  Open system "Save As" dialog via Tauri API.
    3.  App copies the live `flowforge.db` from the app data folder to the selected destination.
    4.  (Optional) Zip the file with a timestamp: `FlowForge-Backup-YYYY-MM-DD.zip`.

### 7.2 Local Check & Restore (Import)
*   **UI:** "Import Backup" button in Settings.
*   **Process:**
    1.  User clicks "Import Backup".
    2.  Open system "Open File" dialog (filter for `.db` or `.zip`).
    3.  **Validation:** Verify the file is a valid database backup.
    4.  **Safety:** Close active DB connections.
    5.  **Restore:** Replace current `flowforge.db` with the imported file.
    6.  **Restart:** Trigger an app restart/reload to apply the restored data.

---


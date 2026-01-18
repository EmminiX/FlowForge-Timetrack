# Implementation Plan - Track: App Rebranding to "FlowForge-Track"

## Phase 1: UI Rebranding
This phase focuses on updating all user-facing text elements within the application to reflect the new name "FlowForge-Track".

- [x] Task: Update Application Configuration and Window Titles 18035f7
    - [ ] Update `productName` and window titles in `src-tauri/tauri.conf.json`.
    - [ ] Update title tag in `index.html`.
    - [ ] Verify `Main.tsx` or `App.tsx` for any dynamic title setting logic.

- [x] Task: Update Layout Components (Sidebar & Header) 5fe33e7
    - [ ] Write failing tests: Update/Create component tests for `Sidebar` and `Header` to assert they display "FlowForge-Track".
    - [ ] Implement: Update the text in `src/components/layout/Sidebar.tsx` and `src/components/layout/Header.tsx`.
    - [ ] Refactor: Ensure text is consistent with styling.
    - [ ] Verify coverage.

- [x] Task: Update Invoice PDF Generation c9e4eea
    - [ ] Write failing tests: Update `invoiceService` tests to check for "FlowForge-Track" in the generated PDF data/footer.
    - [ ] Implement: Update the brand name string in `src/services/invoiceService.ts`.
    - [ ] Refactor: Ensure date/layout remains correct with the longer name.
    - [ ] Verify coverage.

- [ ] Task: General UI Text Sweep
    - [ ] Scan `src/pages/` and `src/features/` for any other hardcoded "FlowForge" strings.
    - [ ] Implement: Update any found instances (e.g., Welcome messages, Settings headers).

- [ ] Task: Conductor - User Manual Verification 'UI Rebranding' (Protocol in workflow.md)

## Phase 2: Documentation Overhaul
This phase addresses the requirement for a neurodivergent-friendly README and updating the project documentation.

- [ ] Task: Revise README.md
    - [ ] Draft new content: Create a "Non-Technical User Guide" section.
    - [ ] Implement: Rewrite `README.md` using clear, direct language and the new brand name.
    - [ ] Review: Verify readability and tone against requirements.

- [ ] Task: Conductor - User Manual Verification 'Documentation Overhaul' (Protocol in workflow.md)

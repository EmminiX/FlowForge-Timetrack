# Implementation Plan - Track: Project Foundation

## Phase 1: Environment & Scaffolding
- [x] Task: Initialize Tauri Project 9f90034
    - [x] Initialize Tauri 2 app with `pnpm create tauri-app` (React/TypeScript).
    - [x] Configure `tsconfig.json` for strict mode.
    - [x] Install and configure ESLint and Prettier.
    - [x] Commit initial project structure.
- [x] Task: Install Core Dependencies 735f868
    - [x] Install `tailwindcss`, `postcss`, `autoprefixer` and init tailwind config.
    - [x] Install `lucide-react`, `clsx`, `tailwind-merge`.
    - [x] Install `zustand`, `react-router-dom`, `react-hook-form`, `zod`.
    - [x] Install `@tauri-apps/plugin-sql` and `@tauri-apps/api`.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Environment & Scaffolding' (Protocol in workflow.md) [checkpoint: 03da382]

## Phase 2: Database Layer
- [x] Task: Database Configuration 945d93b
    - [x] Configure `tauri.conf.json` to enable the SQL plugin.
    - [x] Create `src/lib/db.ts` service to handle database connection.
- [x] Task: Schema Migration c50f414
    - [x] Write SQL migration script for `clients`, `projects`, `time_entries`, `invoices`, `invoice_line_items`, and `settings` tables.
    - [x] Implement migration execution logic in `src/lib/db.ts` or on app startup.
- [x] Task: Verify Database ef66817
    - [x] Write a simple test/script to verify tables are created successfully.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Database Layer' (Protocol in workflow.md) [checkpoint: da55230]

## Phase 3: Core UI Architecture
- [x] Task: Theme System ae39c87
    - [x] Define CSS variables for colors in `src/styles/globals.css`.
    - [x] Create `useTheme` hook and/or store in Zustand to manage Light/Dark/System preference.
    - [x] Implement class toggling on the `<html>` or `<body>` tag.
- [x] Task: Font Scaling System a78c28a
    - [x] Create `useFontSize` hook/store to manage font scaling factor (e.g., 0.75x to 2x).
    - [x] Implement logic to apply this scale (e.g., modifying `root` font-size or using a CSS variable for base size).
- [x] Task: Main Layout Component c0193c3
    - [x] Create `Sidebar` component with navigation links (Dashboard, Clients, Projects, Settings).
    - [x] Create `Header` component.
    - [x] Create `Layout` component that wraps the content area.
- [x] Task: Router Setup 074244d
    - [x] Configure `react-router-dom` with placeholder pages for Dashboard, Clients, etc.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Core UI Architecture' (Protocol in workflow.md)

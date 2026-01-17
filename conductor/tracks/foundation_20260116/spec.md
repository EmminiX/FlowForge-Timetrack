# Track Specification: Project Foundation

## Goal
Establish the core technical foundation for FlowForge, a neurodivergent-friendly time tracking and invoicing application. This includes setting up the Tauri 2 environment with React, configuring the SQLite database, and implementing essential global features like theming and font scaling.

## Core Requirements
1.  **Application Initialization**:
    -   Initialize a new Tauri 2 project using the React and TypeScript template.
    -   Configure `pnpm` as the package manager.
    -   Set up strict TypeScript configuration and ESLint/Prettier rules.

2.  **Database Setup**:
    -   Integrate `tauri-plugin-sql` for SQLite support.
    -   Define and apply the initial schema for `clients`, `projects`, `time_entries`, `invoices`, `invoice_line_items`, and `settings` tables as defined in `GEMINI.md`.

3.  **UI & Styling Architecture**:
    -   Install and configure TailwindCSS.
    -   Implement a Theme Provider that supports Light, Dark, and System modes using CSS variables.
    -   **Critical**: Implement a Font Size Provider that allows global scaling of all text elements, ensuring accessibility.

4.  **State Management**:
    -   Set up Zustand for global state management.
    -   Create initial stores for `settings` (theme, font size) and `db` (database connection status).

5.  **Base Layout**:
    -   Create the main application shell with a Sidebar (navigation) and a Header.
    -   Ensure the layout is responsive and accommodates the "Spacious Layout" design principle.
    -   Set up `react-router-dom` for navigation.

## Technical Details
-   **Framework**: Tauri 2.x, React 18+.
-   **Styling**: TailwindCSS, Lucide React (icons).
-   **Database**: SQLite.
-   **Routing**: React Router DOM 6+.
-   **Validation**: Zod (set up for future use).

## User Stories
-   As a developer, I have a stable, type-safe environment to build features upon.
-   As a user, I can open the app and see a clean, empty interface that respects my system theme.
-   As a user, I can toggle between light and dark modes and see the change immediately.
-   As a user, I can adjust the font size, and the entire application text scales up or down.

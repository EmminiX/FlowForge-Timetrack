# Tech Stack

## Core Technologies
- **Languages**: TypeScript (Frontend logic), Rust (Tauri backend logic), JavaScript (Build scripts/tooling).
- **Frameworks**:
    - **Tauri 2.x**: For building the cross-platform desktop application.
    - **React 18+**: As the UI library for building the frontend interface.

## Frontend & UI
- **Styling**: **TailwindCSS** for utility-first styling, ensuring rapid UI development and consistent design tokens.
- **Icons**: **Lucide React** for a consistent and accessible icon set.
- **PDF Generation**: **jspdf** and **jspdf-autotable** for client-side, offline PDF creation.

## State & Data Management
- **Global State**: **Zustand** for lightweight and performant global state management.
- **Forms**: **React Hook Form** combined with **Zod** for schema validation and type-safe form handling.
- **Data Fetching**: **TanStack Query** (React Query) for managing asynchronous data operations (optional/as needed for complex data sync, though direct SQLite access might be sufficient).

## Backend & Storage
- **Database**: **SQLite** (via `tauri-plugin-sql`) for robust, local-first relational data storage (Clients, Projects, Time Entries, Invoices).
- **Storage**:
    - **File System**: Utilized for saving exported PDFs and potentially for local backups.
    - **Settings**: Stored within SQLite (key-value table) or secure system store for sensitive config.

## Development Tools
- **Package Manager**: pnpm (implied from context/standard practice).
- **Linting/Formatting**: ESLint and Prettier for code quality and style consistency.
- **Testing**: Vitest and React Testing Library for unit and component testing.

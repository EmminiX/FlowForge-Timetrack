# Initial Concept

Build the complete FlowForge-Track application following the PRD.md and IMPLEMENTATION_CHECKLIST.md. The app is a Tauri 2 desktop application with React and TypeScript frontend.

Key features in priority order:
1. Project foundation (Tauri setup, database, theming, font scaling)
2. Client and Project CRUD
3. Timer with floating always-on-top widget
4. Time entries list with filtering
5. Invoicing with PDF export
6. Settings with theme, font size, and business info

Critical requirements:
- Font size setting MUST scale ALL text in the app, not just a preview
- Theme changes MUST apply to the entire UI immediately
- Floating timer widget MUST stay on top of other windows
- PDF export MUST work offline with no network dependencies

Reference the existing documentation files: GEMINI.md (coding standards), PRD.md (full requirements), IMPLEMENTATION_CHECKLIST.md (step-by-step tasks), TECH_STACK.md (technology decisions).

## Target Audience
- **Freelancers**: Seeking accurate, distraction-free time tracking and professional invoicing capabilities to manage their independent business.
- **Neurodivergent Professionals**: Specifically designed for users who benefit from clean interfaces, high contrast options, reduced visual clutter, and accessible design patterns.

## Design Principles
- **Minimalist & Distraction-Free**: The interface prioritizes focus, removing unnecessary elements and animations that could distract the user.
- **Accessibility-First**: Built with large touch targets (minimum 44pt), clear labels with icons, and high-contrast text to ensure usability for all.
- **Customizable Experience**: Supports user preferences for themes (light/dark/system) and global font scaling to accommodate visual needs and comfort.

## Key Features
- **Floating Timer Widget**: An always-on-top, unobtrusive widget for starting, pausing, and stopping time tracking without context switching.
- **Client & Project Management**: Full CRUD capabilities to organize work by client and project, setting hourly rates and tracking status.
- **Invoicing & PDF Export**: Generate professional invoices from time entries and export them as PDFs completely offline, ensuring privacy and reliability.

## Technical Constraints
- **Tauri 2 Desktop Application**: Built as a native-feeling desktop app for macOS, Windows, and Linux using the Tauri 2 framework.
- **Local-First Architecture**: All data is stored locally using SQLite, ensuring data privacy and zero reliance on internet connectivity for core functionality.
- **Offline Capabilities**: Critical features, especially PDF generation, must function without a network connection.
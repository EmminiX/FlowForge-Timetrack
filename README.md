<div align="center">
  <img src="public/EmmiLogo-noBG.png" alt="Emmi Logo" width="100%" />
</div>

# FlowForge-Track

A simple, focused desktop app for tracking your work time and creating invoices. Built with privacy in mind — all your data stays on your computer.

Designed to be easy to use, especially for people who prefer clear interfaces and minimal distractions.

![FlowForge-Track Screenshot](docs/screenshot.png)

## 📖 User Guide

For a complete walkthrough of features and settings, read the **[FlowForge-Track User Guide](https://flowforge.emmi.zone/guide)**.

## 📥 Download

| Platform | Download | Notes |
|----------|----------|-------|
| **macOS** | [Download .dmg](https://github.com/EmminiX/FlowForge-Timetrack/releases/latest) | macOS 10.15+ |
| **Windows** | [Download .exe](https://github.com/EmminiX/FlowForge-Timetrack/releases/latest) | Windows 10+ |
| **Linux** | [Download .AppImage](https://github.com/EmminiX/FlowForge-Timetrack/releases/latest) | Most distros |

> **Note:** The app is not code-signed yet. See [Installation Guide](#-installation-guide) below for how to open it.

## 🌟 Key Features

- **Floating Timer Widget** — A small always-on-top window so you always see your timer, positioned at the corner of your app
- **Client & Project Management** — Organize your work with clients and projects
- **Product Catalog** — Manage reusable products/services with descriptions, prices, and SKUs
- **Offline Invoicing** — Create professional PDF invoices with multi-page support
- **Down Payment Support** — Record deposits on invoices, subtracted from total on PDF and preview
- **CSV Export** — Export invoice data to CSV for spreadsheets and accounting tools
- **Global Keyboard Shortcuts** — Control the timer from anywhere:
  - `Cmd+Shift+S` (Mac) / `Ctrl+Shift+S` (Win/Linux) — Start/Resume
  - `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Win/Linux) — Pause
  - `Cmd+Shift+X` (Mac) / `Ctrl+Shift+X` (Win/Linux) — Stop & Save
  - `Cmd+Shift+W` (Mac) / `Ctrl+Shift+W` (Win/Linux) — Toggle Widget
  - `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Win/Linux) — Toggle Sound
- **Global Search** — Quick-find clients, projects, and invoices from the header (`Cmd+K` / `Ctrl+K`)
- **Pomodoro Timer** — Built-in work/break intervals (25/5 min default, customizable)
- **Dashboard Analytics** — Daily, weekly, and monthly breakdowns with 30-day chart view and per-client/project stats
- **Smart Idle Detection** — Automatically pauses the timer when you step away
- **Customizable UI** — Light/Dark theme, Lexend font, adjustable font size and density
- **App Update System** — Checks for updates automatically and notifies you of new releases
- **Time Editing** — Manually adjust time logs to correct mistakes or add missed time
- **High Contrast Theme** — Improved visibility for low-vision users
- **Disable Animations** — Option to turn off UI animations for a calmer experience
- **Multi-Currency Support** — Set currency per client (EUR, USD, GBP) with correct symbols throughout
- **Backup & Restore** — Export your data for safe-keeping or move it to another device
- **Undo Actions** — Toast-based undo system for destructive actions (delete with undo)
- **Keyboard Navigation** — Full keyboard shortcuts dialog (`?` key) and keyboard-friendly UI
- **Error Boundaries** — Graceful error handling prevents full-app crashes

## 🛡️ Data Protection

FlowForge-Track includes built-in protection against accidental data loss:

- **Cascading Delete Protection** — You cannot delete a client that has projects, or a project that has time entries
- **Delete Order** — To remove a client completely, you must first delete their time entries, then projects, then the client
- **No Undo Needed** — This deliberate friction prevents accidental deletion of important billing data

## 📁 Data Storage & Privacy

**How and where is data stored?**
Data is stored locally in a SQLite database file named `flowforge.db` within your operating system's application data directory.

- **macOS**: `~/Library/Application Support/com.emmi.flowforge/flowforge.db`
- **Windows**: `C:\Users\{username}\AppData\Local\com.emmi.flowforge\flowforge.db`
- **Linux**: `~/.local/share/com.emmi.flowforge/flowforge.db` *(Standard XDG data path)*

**What are the storage limits?**
There are no artificial limits imposed by the application. Storage is only limited by the available disk space on your computer.

**How is data storage controlled?**
- **Control**: You have full ownership of the local database file.
- **Access**: The app manages data internally, but you can manually back up, copy, or delete the `flowforge.db` file if needed.
- **Security**: Access is controlled by your operating system's user permissions.

## 📦 Installation Guide

### macOS

Since the app isn't code-signed yet, macOS will show a security warning:

1. Download the `.dmg` file
2. Open it and drag FlowForge-Track to Applications
3. **First launch:** Right-click the app → Select "Open" → Click "Open" in the dialog
4. Grant Accessibility permissions for keyboard shortcuts:
   - System Settings → Privacy & Security → Accessibility
   - Click `+` and add FlowForge-Track

### Windows

Windows SmartScreen may show a warning:

1. Download the `.exe` installer
2. If you see "Windows protected your PC", click "More info"
3. Click "Run anyway"
4. Follow the installation wizard

### Linux

1. Download the `.AppImage` file
2. Make it executable: `chmod +x FlowForge-Track.AppImage`
3. Run it: `./FlowForge-Track.AppImage`

## 🚀 Quick Start

1. **Add a Client** — Go to Clients → New Client
2. **Create a Project** — Go to Projects → New Project (link it to your client)
3. **Start Tracking** — Go to Timer → Select project → Click Start
4. **Create Invoice** — Go to Invoices → New Invoice → Select client and time entries

## 🛠 For Developers

### Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 4, Zustand
- **Backend:** Tauri 2 (Rust)
- **Database:** SQLite (local)
- **Build:** Vite 7

### Requirements

- [Rust](https://www.rust-lang.org/) (latest stable)
- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/)

### Development

```bash
# Install dependencies
pnpm install

# Start development mode
pnpm tauri dev

# Run tests
pnpm test

# Type check
pnpm exec tsc --noEmit
```

### Build

```bash
# Build for current platform
pnpm tauri build
```

Outputs are in `src-tauri/target/release/bundle/`

### Project Structure

```
src/                    # React frontend
├── components/         # Shared UI components
├── features/          # Feature modules (timer, clients, invoices, etc.)
├── services/          # Database service layer
├── stores/            # Zustand state stores
└── types/             # TypeScript types

src-tauri/             # Rust backend
├── src/lib.rs         # Main Tauri setup, commands, migrations
└── tauri.conf.json    # App configuration
```

## 📄 License

**AGPL-3.0** — Free and open source.

This software is licensed under the [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html). You are free to use, modify, and distribute it under the terms of the AGPL-3.0.

**What this means:**
- Use it freely for any purpose (personal, educational, commercial)
- Modify and share it — but derivatives must also be AGPL-3.0
- If you run a modified version as a network service, you must share the source

**Commercial licensing** (proprietary use without AGPL obligations) is available — contact security@emmi.zone.

See [LICENSE](LICENSE) for full legal details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. By contributing, you agree that your contributions will be licensed under the AGPL-3.0.

---

## 👨‍💻 About

**Made with ❤️ by [Emmi](https://emmi.zone)** — for freelancers and small teams who value simplicity and privacy.

FlowForge-Track was born from the need for a simple, privacy-focused time tracking tool that doesn't require subscriptions, cloud accounts, or complex setup. It's built to respect your data and your workflow.

**Connect:**
- 🌐 Website: [emmi.zone](https://emmi.zone)
- 📝 Blog: [blog.emmi.zone](https://blog.emmi.zone)
- 💼 LinkedIn: [linkedin.com/in/emmic](https://www.linkedin.com/in/emmic/)

---

*This project is open source under AGPL-3.0. If you find it valuable, consider sharing it with others who might benefit from it.*

# FlowForge-Track

FlowForge-Track is a simple, focused app for tracking your work time and creating invoices.

It is designed to be easy to use, especially for people who prefer clear interfaces and less distraction.

## 🌟 Key Features

- **Floating Timer**: A small window that stays on top so you always see your timer.
- **Client & Project Management**: Organize your work easily.
- **Offline Invoicing**: Create professional PDF invoices without needing the internet.
- **Global Keyboard Shortcuts**: Control the timer (`Cmd+Shift+S/P/X`) from anywhere on your computer.
- **Dashboard Analytics**: Visual breakdown of your daily and weekly progress.
- **Smart Idle Detection**: Automatically pauses the timer when you walk away.
- **Customizable**: Change the theme (Light/Dark) and font size to fit your needs.

## ⚠️ Important Note for Mac Users

To use **Global Keyboard Shortcuts**, you must grant Accessibility permissions:
1. Go to **System Settings > Privacy & Security > Accessibility**
2. Click the `+` button
3. Add **FlowForge-Track** to the list
4. Restart the app

## 🚀 For Non-Technical Users (Getting Started)

If you just want to use the app, follow these steps:

1. **Download**: Get the latest version for your computer (Windows, Mac, or Linux).
2. **Install**: Open the downloaded file and follow the instructions to install it.
3. **Set Up**:
   - Open the app.
   - Go to **Clients** to add who you work for.
   - Go to **Projects** to create a project for that client.
4. **Track Time**:
   - Go to the **Timer** page.
   - Select your project and press **Play**.
   - When finished, press **Stop** to save your time.
5. **Invoice**:
   - Go to **Invoices**.
   - Click **New Invoice**, select your client, and follow the steps to create a PDF.

## 🛠 For Developers (Setup)

This is a Tauri 2 application built with React and TypeScript.

### Requirements
- [Rust](https://www.rust-lang.org/)
- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)

### Development
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start the app in development mode:
   ```bash
   pnpm tauri dev
   ```

### Build
To create a production version:
```bash
pnpm tauri build
```
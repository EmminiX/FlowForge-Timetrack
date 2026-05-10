# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in TimeSage, email e.covasa@me.com.

Do not report security vulnerabilities through public GitHub issues.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.2.x   | Yes       |

## Desktop File Access

TimeSage stores its local SQLite database in the Tauri app data directory. The
desktop app does not request blanket filesystem write access.

Supported user-selected file operations are limited to:

- Backup export and import of `.db` files from Desktop, Documents, or Downloads.
- CSV export of `.csv` files to Desktop, Documents, or Downloads.
- Invoice PDF export of `.pdf` files to Desktop, Documents, or Downloads.

Service code rejects selected paths outside those directories before invoking
Tauri filesystem commands. Tauri capabilities also scope the filesystem plugin
to the app database files and the explicit export/import patterns above.

## Security Updates

Security patches will be released as soon as possible after a vulnerability is
confirmed.

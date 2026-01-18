use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};
use user_idle::UserIdle;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Get system idle time in seconds
#[tauri::command]
fn get_idle_time() -> u64 {
    let time = UserIdle::get_time()
        .map(|idle| idle.as_seconds())
        .unwrap_or(0);
    // println!("Rust Idle Check: {}s", time);
    time
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
                CREATE TABLE IF NOT EXISTS clients (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT,
                    address TEXT,
                    phone TEXT,
                    hourly_rate REAL,
                    notes TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    client_id TEXT,
                    name TEXT NOT NULL,
                    description TEXT,
                    status TEXT DEFAULT 'active',
                    color TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (client_id) REFERENCES clients(id)
                );

                CREATE TABLE IF NOT EXISTS time_entries (
                    id TEXT PRIMARY KEY,
                    project_id TEXT,
                    start_time TEXT NOT NULL,
                    end_time TEXT,
                    pause_duration INTEGER DEFAULT 0,
                    notes TEXT,
                    is_billable INTEGER DEFAULT 1,
                    is_billed INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects(id)
                );

                CREATE TABLE IF NOT EXISTS invoices (
                    id TEXT PRIMARY KEY,
                    client_id TEXT,
                    invoice_number TEXT NOT NULL,
                    issue_date TEXT,
                    due_date TEXT,
                    status TEXT DEFAULT 'draft',
                    notes TEXT,
                    tax_rate REAL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (client_id) REFERENCES clients(id)
                );

                CREATE TABLE IF NOT EXISTS invoice_line_items (
                    id TEXT PRIMARY KEY,
                    invoice_id TEXT,
                    description TEXT NOT NULL,
                    quantity REAL,
                    unit_price REAL,
                    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
                );

                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT
                );
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_vat_number_to_clients",
            sql: "ALTER TABLE clients ADD COLUMN vat_number TEXT;",
            kind: MigrationKind::Up,
        },
    ];

    let mut builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:flowforge.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init());

    // Setup global shortcuts plugin on desktop platforms
    // Note: Actual shortcut registration is done via JavaScript API
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_global_shortcut::Builder::new().build());
    }

    builder
        .invoke_handler(tauri::generate_handler![greet, get_idle_time])
        .on_window_event(|window, event| {
            // When main window is closed, close widget and exit app
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if window.label() == "main" {
                    // Close the widget window if it exists
                    if let Some(widget_window) = window.app_handle().get_webview_window("widget") {
                        let _ = widget_window.destroy();
                    }
                    // Exit the application
                    std::process::exit(0);
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // Handle dock icon click on macOS
            if let tauri::RunEvent::Reopen {
                has_visible_windows,
                ..
            } = event
            {
                if !has_visible_windows {
                    // Show and focus main window when dock icon is clicked
                    if let Some(main_window) = app_handle.get_webview_window("main") {
                        let _ = main_window.show();
                        let _ = main_window.unminimize();
                        let _ = main_window.set_focus();
                    }
                }
            }
        });
}

use serde::Serialize;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};
use user_idle::UserIdle;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ActiveWindowSnapshot {
    app_name: String,
    window_title: Option<String>,
}

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

#[tauri::command]
fn get_active_window_snapshot(include_title: bool) -> Option<ActiveWindowSnapshot> {
    #[cfg(desktop)]
    {
        match active_win_pos_rs::get_active_window() {
            Ok(active_window) => {
                let title = active_window.title.trim().to_string();
                Some(ActiveWindowSnapshot {
                    app_name: active_window.app_name,
                    window_title: if include_title && !title.is_empty() {
                        Some(title)
                    } else {
                        None
                    },
                })
            }
            Err(_) => None,
        }
    }

    #[cfg(not(desktop))]
    {
        let _ = include_title;
        None
    }
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
        Migration {
            version: 3,
            description: "add_currency_to_clients",
            sql: "ALTER TABLE clients ADD COLUMN currency TEXT DEFAULT 'EUR';",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_products_table",
            sql: "CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                price REAL DEFAULT 0,
                sku TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_default_values_to_clients",
            sql: "
                -- SQLite doesn't support ALTER COLUMN to add defaults,
                -- but the TS service layer already handles defaults via || ''.
                -- This migration exists for schema documentation and fresh installs
                -- where we want consistent behavior. For existing installs,
                -- the service layer continues to handle null coalescing.
                SELECT 1;
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_down_payment_to_invoices",
            sql: "ALTER TABLE invoices ADD COLUMN down_payment REAL DEFAULT 0;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "create_down_payments_table",
            sql: "CREATE TABLE IF NOT EXISTS down_payments (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
                amount REAL NOT NULL,
                payment_date TEXT NOT NULL,
                notes TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_down_payments_client_id ON down_payments(client_id);
            CREATE INDEX IF NOT EXISTS idx_down_payments_payment_date ON down_payments(payment_date);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "add_project_budget_columns",
            sql: "
                ALTER TABLE projects ADD COLUMN budget_type TEXT DEFAULT 'none';
                ALTER TABLE projects ADD COLUMN budget_hours REAL DEFAULT 0;
                ALTER TABLE projects ADD COLUMN budget_amount REAL DEFAULT 0;
                ALTER TABLE projects ADD COLUMN budget_alert_threshold REAL DEFAULT 0.8;
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "create_expenses_table",
            sql: "CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                expense_date TEXT NOT NULL,
                receipt_path TEXT,
                is_billable INTEGER DEFAULT 1,
                is_billed INTEGER DEFAULT 0,
                invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
                notes TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_expenses_client_id ON expenses(client_id);
            CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
            CREATE INDEX IF NOT EXISTS idx_expenses_invoice_id ON expenses(invoice_id);
            CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "create_activity_timeline_events_table",
            sql: "CREATE TABLE IF NOT EXISTS activity_timeline_events (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                app_name TEXT NOT NULL,
                window_title TEXT,
                started_at TEXT NOT NULL,
                ended_at TEXT NOT NULL,
                duration_seconds INTEGER DEFAULT 0,
                source TEXT DEFAULT 'system',
                project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
                time_entry_id TEXT REFERENCES time_entries(id) ON DELETE SET NULL,
                notes TEXT DEFAULT '',
                is_dismissed INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_activity_timeline_started_at ON activity_timeline_events(started_at);
            CREATE INDEX IF NOT EXISTS idx_activity_timeline_project_id ON activity_timeline_events(project_id);
            CREATE INDEX IF NOT EXISTS idx_activity_timeline_time_entry_id ON activity_timeline_events(time_entry_id);",
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
        .invoke_handler(tauri::generate_handler![
            greet,
            get_idle_time,
            get_active_window_snapshot
        ])
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
            // Handle dock icon click on macOS only
            // RunEvent::Reopen is macOS-specific and doesn't exist on Windows/Linux
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = event {
                // Always try to restore main window on dock click
                // (widget might be visible but main window minimized)
                if let Some(main_window) = app_handle.get_webview_window("main") {
                    let _ = main_window.show();
                    let _ = main_window.unminimize();
                    let _ = main_window.set_focus();
                }
            }

            // Suppress unused variable warning on non-macOS platforms
            #[cfg(not(target_os = "macos"))]
            let _ = (app_handle, event);
        });
}

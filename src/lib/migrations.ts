// Database migrations for FlowForge
// Run these on app startup to ensure schema is up to date

import { getDb } from './db';
import { dbLogger } from './logger';
import { shouldUseDemoMode } from './platform';

export async function runMigrations(): Promise<void> {
  if (shouldUseDemoMode()) {
    dbLogger.info('Skipping SQLite migrations in demo mode');
    return;
  }

  const db = await getDb();

  // Create clients table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      vat_number TEXT DEFAULT '',
      hourly_rate REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create projects table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      color TEXT DEFAULT '#007AFF',
      budget_type TEXT DEFAULT 'none',
      budget_hours REAL DEFAULT 0,
      budget_amount REAL DEFAULT 0,
      budget_alert_threshold REAL DEFAULT 0.8,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create time_entries table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      start_time TEXT NOT NULL,
      end_time TEXT,
      pause_duration INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      is_billable INTEGER DEFAULT 1,
      is_billed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  // Create invoices table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      invoice_number TEXT NOT NULL UNIQUE,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      notes TEXT DEFAULT '',
      tax_rate REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create invoice_line_items table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoice_line_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL
    )
  `);

  // Create settings table (key-value store)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create indexes for common queries
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id)
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id)
    `);

  // Create products table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS products(
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price REAL DEFAULT 0,
      sku TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
    `);

  // Migration: Add vat_number column to clients if it doesn't exist
  try {
    await db.execute(`ALTER TABLE clients ADD COLUMN vat_number TEXT DEFAULT ''`);
  } catch {
    // Column already exists, ignore error
  }

  // Migration: Add currency column to clients if it doesn't exist
  try {
    await db.execute(`ALTER TABLE clients ADD COLUMN currency TEXT DEFAULT 'EUR'`);
  } catch {
    // Column already exists, ignore error
  }

  // Migration: Add down_payment column to invoices if it doesn't exist
  try {
    await db.execute(`ALTER TABLE invoices ADD COLUMN down_payment REAL DEFAULT 0`);
  } catch {
    // Column already exists, ignore error
  }

  // Create down_payments table (payment ledger)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS down_payments (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_down_payments_client_id ON down_payments(client_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_down_payments_payment_date ON down_payments(payment_date)
  `);

  // Create expenses table for billable expense and receipt tracking
  await db.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
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
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_expenses_client_id ON expenses(client_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_expenses_invoice_id ON expenses(invoice_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date)
  `);

  // Create activity timeline table for private local-only activity capture
  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_timeline_events (
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
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_activity_timeline_started_at ON activity_timeline_events(started_at)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_activity_timeline_project_id ON activity_timeline_events(project_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_activity_timeline_time_entry_id ON activity_timeline_events(time_entry_id)
  `);

  // Create invoice payment hub tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoice_payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      method TEXT DEFAULT 'bank_transfer',
      reference TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_date ON invoice_payments(payment_date)
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoice_events (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      event_date TEXT NOT NULL,
      message TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice_id ON invoice_events(invoice_id)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_invoice_events_event_date ON invoice_events(event_date)
  `);

  const projectBudgetColumns = [
    `ALTER TABLE projects ADD COLUMN budget_type TEXT DEFAULT 'none'`,
    `ALTER TABLE projects ADD COLUMN budget_hours REAL DEFAULT 0`,
    `ALTER TABLE projects ADD COLUMN budget_amount REAL DEFAULT 0`,
    `ALTER TABLE projects ADD COLUMN budget_alert_threshold REAL DEFAULT 0.8`,
  ];

  for (const statement of projectBudgetColumns) {
    try {
      await db.execute(statement);
    } catch {
      // Column already exists, ignore error
    }
  }

  dbLogger.info('Database migrations completed successfully');
}

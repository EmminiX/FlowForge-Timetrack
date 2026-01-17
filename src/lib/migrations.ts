// Database migrations for FlowForge
// Run these on app startup to ensure schema is up to date

import { getDb } from './db';

export async function runMigrations(): Promise<void> {
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

  // Migration: Add vat_number column to clients if it doesn't exist
  try {
    await db.execute(`ALTER TABLE clients ADD COLUMN vat_number TEXT DEFAULT ''`);
  } catch {
    // Column already exists, ignore error
  }

  console.log('Database migrations completed successfully');
}

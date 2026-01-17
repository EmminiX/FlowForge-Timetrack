// Client CRUD service

import { getDb } from '../lib/db';
import type { Client, ClientWithStats, CreateClientInput, UpdateClientInput } from '../types';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export const clientService = {
  // Get all clients
  async getAll(): Promise<Client[]> {
    const db = await getDb();
    const result = await db.select<Client[]>(`
      SELECT 
        id, name, email, address, phone,
        hourly_rate as hourlyRate,
        notes,
        created_at as createdAt,
        updated_at as updatedAt
      FROM clients
      ORDER BY name ASC
    `);
    return result;
  },

  // Get all clients with stats (hours, billable, project count)
  async getAllWithStats(): Promise<ClientWithStats[]> {
    const db = await getDb();
    const result = await db.select<ClientWithStats[]>(`
      SELECT 
        c.id, c.name, c.email, c.address, c.phone,
        c.hourly_rate as hourlyRate,
        c.notes,
        c.created_at as createdAt,
        c.updated_at as updatedAt,
        COALESCE(SUM(
          CASE WHEN te.end_time IS NOT NULL 
          THEN (julianday(te.end_time) - julianday(te.start_time)) * 86400 - te.pause_duration
          ELSE 0 END
        ), 0) / 3600.0 as totalHours,
        COALESCE(SUM(
          CASE WHEN te.end_time IS NOT NULL AND te.is_billable = 1
          THEN ((julianday(te.end_time) - julianday(te.start_time)) * 86400 - te.pause_duration) / 3600.0 * c.hourly_rate
          ELSE 0 END
        ), 0) as totalBillable,
        COUNT(DISTINCT p.id) as projectCount
      FROM clients c
      LEFT JOIN projects p ON p.client_id = c.id
      LEFT JOIN time_entries te ON te.project_id = p.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    return result;
  },

  // Get client by ID
  async getById(id: string): Promise<Client | null> {
    const db = await getDb();
    const result = await db.select<Client[]>(`
      SELECT 
        id, name, email, address, phone,
        hourly_rate as hourlyRate,
        notes,
        created_at as createdAt,
        updated_at as updatedAt
      FROM clients
      WHERE id = $1
    `, [id]);
    return result[0] || null;
  },

  // Create a new client
  async create(input: CreateClientInput): Promise<Client> {
    console.log('clientService.create called with:', input);
    try {
      const db = await getDb();
      console.log('Got database connection');
      const id = generateId();
      const timestamp = now();

      console.log('Executing INSERT for client:', id);
      await db.execute(`
      INSERT INTO clients (id, name, email, address, phone, hourly_rate, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
        id,
        input.name,
        input.email || '',
        input.address || '',
        input.phone || '',
        input.hourlyRate || 0,
        input.notes || '',
        timestamp,
        timestamp,
      ]);
      console.log('INSERT successful for client:', id);

      return {
        id,
        name: input.name,
        email: input.email || '',
        address: input.address || '',
        phone: input.phone || '',
        hourlyRate: input.hourlyRate || 0,
        notes: input.notes || '',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    } catch (err) {
      console.error('clientService.create failed:', err);
      throw err;
    }
  },

  // Update a client
  async update(id: string, input: UpdateClientInput): Promise<Client | null> {
    const db = await getDb();
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...input,
      updatedAt: now(),
    };

    await db.execute(`
      UPDATE clients SET
        name = $1,
        email = $2,
        address = $3,
        phone = $4,
        hourly_rate = $5,
        notes = $6,
        updated_at = $7
      WHERE id = $8
    `, [
      updated.name,
      updated.email,
      updated.address,
      updated.phone,
      updated.hourlyRate,
      updated.notes,
      updated.updatedAt,
      id,
    ]);

    return updated;
  },

  // Delete a client
  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    await db.execute('DELETE FROM clients WHERE id = $1', [id]);
    return true;
  },
};

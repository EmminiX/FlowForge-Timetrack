// Client CRUD service

import { getDb } from '../lib/db';
import { clientLogger } from '../lib/logger';
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
    clientLogger.debug('getAll called');
    try {
      const db = await getDb();
      const result = await db.select<Client[]>(`
        SELECT 
          id, name, email, address, phone, vat_number as vatNumber,
          hourly_rate as hourlyRate,
          COALESCE(currency, 'EUR') as currency,
          notes,
          created_at as createdAt,
          updated_at as updatedAt
        FROM clients
        ORDER BY name ASC
      `);
      clientLogger.info('getAll completed', { count: result.length });
      return result;
    } catch (error) {
      clientLogger.error('getAll failed', error);
      throw error;
    }
  },

  // Get all clients with stats (hours, billable, project count)
  async getAllWithStats(): Promise<ClientWithStats[]> {
    clientLogger.debug('getAllWithStats called');
    try {
      const db = await getDb();
      const result = await db.select<ClientWithStats[]>(`
        SELECT 
          c.id, c.name, c.email, c.address, c.phone, c.vat_number as vatNumber,
          c.hourly_rate as hourlyRate,
          COALESCE(c.currency, 'EUR') as currency,
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
      clientLogger.info('getAllWithStats completed', { count: result.length });
      return result;
    } catch (error) {
      clientLogger.error('getAllWithStats failed', error);
      throw error;
    }
  },

  // Get client by ID
  async getById(id: string): Promise<Client | null> {
    clientLogger.debug('getById called', { id });
    try {
      const db = await getDb();
      const result = await db.select<Client[]>(
        `
        SELECT 
          id, name, email, address, phone, vat_number as vatNumber,
          hourly_rate as hourlyRate,
          COALESCE(currency, 'EUR') as currency,
          notes,
          created_at as createdAt,
          updated_at as updatedAt
        FROM clients
        WHERE id = $1
      `,
        [id],
      );
      const client = result[0] || null;
      clientLogger.info('getById completed', { id, found: !!client });
      return client;
    } catch (error) {
      clientLogger.error('getById failed', error, { id });
      throw error;
    }
  },

  // Create a new client
  async create(input: CreateClientInput): Promise<Client> {
    clientLogger.info('create called', { input });
    try {
      const db = await getDb();
      clientLogger.debug('Got database connection');
      const id = generateId();
      const timestamp = now();

      clientLogger.debug('Executing INSERT', { id, name: input.name });
      await db.execute(
        `
      INSERT INTO clients (id, name, email, address, phone, vat_number, hourly_rate, currency, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
        [
          id,
          input.name,
          input.email || '',
          input.address || '',
          input.phone || '',
          input.vatNumber || '',
          input.hourlyRate || 0,
          input.currency || 'EUR',
          input.notes || '',
          timestamp,
          timestamp,
        ],
      );
      clientLogger.info('create successful', { id, name: input.name });

      return {
        id,
        name: input.name,
        email: input.email || '',
        address: input.address || '',
        phone: input.phone || '',
        vatNumber: input.vatNumber || '',
        hourlyRate: input.hourlyRate || 0,
        currency: input.currency || 'EUR',
        notes: input.notes || '',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    } catch (error) {
      clientLogger.error('create failed', error, { input });
      throw error;
    }
  },

  // Update a client
  async update(id: string, input: UpdateClientInput): Promise<Client | null> {
    clientLogger.info('update called', { id, input });
    try {
      const db = await getDb();
      const existing = await this.getById(id);
      if (!existing) {
        clientLogger.warn('update: client not found', { id });
        return null;
      }

      const updated = {
        ...existing,
        ...input,
        updatedAt: now(),
      };

      await db.execute(
        `
        UPDATE clients SET
          name = $1,
          email = $2,
          address = $3,
          phone = $4,
          vat_number = $5,
          hourly_rate = $6,
          currency = $7,
          notes = $8,
          updated_at = $9
        WHERE id = $10
      `,
        [
          updated.name,
          updated.email,
          updated.address,
          updated.phone,
          updated.vatNumber,
          updated.hourlyRate,
          updated.currency || 'EUR',
          updated.notes,
          updated.updatedAt,
          id,
        ],
      );

      clientLogger.info('update successful', { id });
      return updated;
    } catch (error) {
      clientLogger.error('update failed', error, { id, input });
      throw error;
    }
  },

  // Delete a client
  async delete(id: string): Promise<boolean> {
    clientLogger.info('delete called', { id });
    try {
      const db = await getDb();
      await db.execute('DELETE FROM clients WHERE id = $1', [id]);
      clientLogger.info('delete successful', { id });
      return true;
    } catch (error) {
      clientLogger.error('delete failed', error, { id });
      throw error;
    }
  },
};

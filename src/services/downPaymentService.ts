// Down payment (deposit) CRUD service

import { getDb } from '../lib/db';
import { downPaymentLogger } from '../lib/logger';
import type {
  DownPayment,
  DownPaymentWithDetails,
  CreateDownPaymentInput,
  UpdateDownPaymentInput,
} from '../types';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export const downPaymentService = {
  // Get all down payments with client/project details
  async getAll(): Promise<DownPaymentWithDetails[]> {
    const db = await getDb();
    downPaymentLogger.debug('Loading all down payments');

    const result = await db.select<DownPaymentWithDetails[]>(`
      SELECT
        dp.id,
        dp.client_id as clientId,
        dp.project_id as projectId,
        dp.amount,
        dp.payment_date as paymentDate,
        dp.notes,
        dp.created_at as createdAt,
        dp.updated_at as updatedAt,
        c.name as clientName,
        p.name as projectName
      FROM down_payments dp
      JOIN clients c ON c.id = dp.client_id
      LEFT JOIN projects p ON p.id = dp.project_id
      ORDER BY dp.payment_date DESC
    `);

    downPaymentLogger.info('Loaded down payments', { count: result.length });
    return result;
  },

  // Get down payments for a specific client
  async getByClientId(clientId: string): Promise<DownPaymentWithDetails[]> {
    const db = await getDb();
    downPaymentLogger.debug('Loading down payments for client', { clientId });

    const result = await db.select<DownPaymentWithDetails[]>(
      `
      SELECT
        dp.id,
        dp.client_id as clientId,
        dp.project_id as projectId,
        dp.amount,
        dp.payment_date as paymentDate,
        dp.notes,
        dp.created_at as createdAt,
        dp.updated_at as updatedAt,
        c.name as clientName,
        p.name as projectName
      FROM down_payments dp
      JOIN clients c ON c.id = dp.client_id
      LEFT JOIN projects p ON p.id = dp.project_id
      WHERE dp.client_id = $1
      ORDER BY dp.payment_date DESC
    `,
      [clientId],
    );

    return result;
  },

  // Get total down payments for a client
  async getTotalByClientId(clientId: string): Promise<number> {
    const db = await getDb();
    const result = await db.select<Array<{ total: number }>>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM down_payments WHERE client_id = $1`,
      [clientId],
    );
    return result[0]?.total || 0;
  },

  // Get by ID
  async getById(id: string): Promise<DownPaymentWithDetails | null> {
    const db = await getDb();
    const result = await db.select<DownPaymentWithDetails[]>(
      `
      SELECT
        dp.id,
        dp.client_id as clientId,
        dp.project_id as projectId,
        dp.amount,
        dp.payment_date as paymentDate,
        dp.notes,
        dp.created_at as createdAt,
        dp.updated_at as updatedAt,
        c.name as clientName,
        p.name as projectName
      FROM down_payments dp
      JOIN clients c ON c.id = dp.client_id
      LEFT JOIN projects p ON p.id = dp.project_id
      WHERE dp.id = $1
    `,
      [id],
    );

    return result[0] || null;
  },

  // Create a new down payment
  async create(input: CreateDownPaymentInput): Promise<DownPayment> {
    const db = await getDb();
    const id = generateId();
    const timestamp = now();

    downPaymentLogger.debug('Creating down payment', { clientId: input.clientId, amount: input.amount });

    await db.execute(
      `
      INSERT INTO down_payments (id, client_id, project_id, amount, payment_date, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        id,
        input.clientId,
        input.projectId || null,
        input.amount,
        input.paymentDate,
        input.notes || '',
        timestamp,
        timestamp,
      ],
    );

    downPaymentLogger.info('Created down payment', { id, clientId: input.clientId, amount: input.amount });

    return {
      id,
      clientId: input.clientId,
      projectId: input.projectId || null,
      amount: input.amount,
      paymentDate: input.paymentDate,
      notes: input.notes || '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  },

  // Update a down payment
  async update(id: string, input: UpdateDownPaymentInput): Promise<DownPayment | null> {
    const db = await getDb();
    const existing = await db.select<DownPayment[]>(
      `
      SELECT
        id,
        client_id as clientId,
        project_id as projectId,
        amount,
        payment_date as paymentDate,
        notes,
        created_at as createdAt,
        updated_at as updatedAt
      FROM down_payments
      WHERE id = $1
    `,
      [id],
    );

    if (!existing[0]) {
      downPaymentLogger.warn('Down payment not found for update', { id });
      return null;
    }

    const updated = {
      ...existing[0],
      ...input,
      updatedAt: now(),
    };

    await db.execute(
      `
      UPDATE down_payments SET
        project_id = $1,
        amount = $2,
        payment_date = $3,
        notes = $4,
        updated_at = $5
      WHERE id = $6
    `,
      [
        updated.projectId || null,
        updated.amount,
        updated.paymentDate,
        updated.notes,
        updated.updatedAt,
        id,
      ],
    );

    downPaymentLogger.info('Updated down payment', { id });
    return updated;
  },

  // Delete a down payment
  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    downPaymentLogger.debug('Deleting down payment', { id });
    await db.execute('DELETE FROM down_payments WHERE id = $1', [id]);
    downPaymentLogger.info('Deleted down payment', { id });
    return true;
  },
};

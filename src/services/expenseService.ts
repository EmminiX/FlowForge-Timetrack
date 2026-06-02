// Expense and receipt CRUD service

import { getDb } from '../lib/db';
import { expenseLogger } from '../lib/logger';
import { shouldUseDemoMode } from '../lib/platform';
import type {
  CreateExpenseInput,
  Expense,
  ExpenseFilters,
  ExpenseWithDetails,
  UpdateExpenseInput,
} from '../types';
import { demoRepository } from './demoRepository';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function normalizeBoolean(value: boolean | number): boolean {
  return value === true || value === 1;
}

function normalizeExpense<T extends Expense | ExpenseWithDetails>(expense: T): T {
  return {
    ...expense,
    isBillable: normalizeBoolean(expense.isBillable),
    isBilled: normalizeBoolean(expense.isBilled),
  };
}

const expenseSelect = `
  SELECT
    e.id,
    e.client_id as clientId,
    e.project_id as projectId,
    e.description,
    e.amount,
    e.expense_date as expenseDate,
    e.receipt_path as receiptPath,
    e.is_billable as isBillable,
    e.is_billed as isBilled,
    e.invoice_id as invoiceId,
    e.notes,
    e.created_at as createdAt,
    e.updated_at as updatedAt,
    c.name as clientName,
    p.name as projectName
  FROM expenses e
  JOIN clients c ON c.id = e.client_id
  LEFT JOIN projects p ON p.id = e.project_id
`;

export const expenseService = {
  async getAll(filters: ExpenseFilters = {}): Promise<ExpenseWithDetails[]> {
    if (shouldUseDemoMode()) {
      return demoRepository.expenses.getAll(filters);
    }

    const where: string[] = [];
    const params: Array<string | number> = [];

    if (filters.clientId) {
      params.push(filters.clientId);
      where.push(`e.client_id = $${params.length}`);
    }
    if (filters.projectId) {
      params.push(filters.projectId);
      where.push(`e.project_id = $${params.length}`);
    }
    if (filters.isBillable !== undefined) {
      params.push(filters.isBillable ? 1 : 0);
      where.push(`e.is_billable = $${params.length}`);
    }
    if (filters.isBilled !== undefined) {
      params.push(filters.isBilled ? 1 : 0);
      where.push(`e.is_billed = $${params.length}`);
    }

    const db = await getDb();
    const result = await db.select<ExpenseWithDetails[]>(
      `
      ${expenseSelect}
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY e.expense_date DESC, e.created_at DESC
    `,
      params,
    );

    return result.map(normalizeExpense);
  },

  async getUnbilledByClientId(clientId: string): Promise<ExpenseWithDetails[]> {
    if (shouldUseDemoMode()) {
      return demoRepository.expenses.getUnbilledByClientId(clientId);
    }

    const db = await getDb();
    const result = await db.select<ExpenseWithDetails[]>(
      `
      ${expenseSelect}
      WHERE e.client_id = $1
        AND e.is_billable = 1
        AND e.is_billed = 0
      ORDER BY e.expense_date ASC, e.created_at ASC
    `,
      [clientId],
    );

    return result.map(normalizeExpense);
  },

  async getById(id: string): Promise<ExpenseWithDetails | null> {
    if (shouldUseDemoMode()) {
      return demoRepository.expenses.getById(id);
    }

    const db = await getDb();
    const result = await db.select<ExpenseWithDetails[]>(
      `
      ${expenseSelect}
      WHERE e.id = $1
    `,
      [id],
    );

    return result[0] ? normalizeExpense(result[0]) : null;
  },

  async create(input: CreateExpenseInput): Promise<Expense> {
    if (shouldUseDemoMode()) {
      return demoRepository.expenses.create(input);
    }

    const db = await getDb();
    const id = generateId();
    const timestamp = now();

    expenseLogger.debug('Creating expense', { clientId: input.clientId, amount: input.amount });

    await db.execute(
      `
      INSERT INTO expenses (
        id,
        client_id,
        project_id,
        description,
        amount,
        expense_date,
        receipt_path,
        is_billable,
        is_billed,
        invoice_id,
        notes,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `,
      [
        id,
        input.clientId,
        input.projectId || null,
        input.description,
        input.amount,
        input.expenseDate,
        input.receiptPath || null,
        input.isBillable ? 1 : 0,
        0,
        null,
        input.notes || '',
        timestamp,
        timestamp,
      ],
    );

    expenseLogger.info('Created expense', { id, clientId: input.clientId, amount: input.amount });

    return {
      id,
      clientId: input.clientId,
      projectId: input.projectId || null,
      description: input.description,
      amount: input.amount,
      expenseDate: input.expenseDate,
      receiptPath: input.receiptPath || null,
      isBillable: input.isBillable,
      isBilled: false,
      invoiceId: null,
      notes: input.notes || '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  },

  async update(id: string, input: UpdateExpenseInput): Promise<Expense | null> {
    if (shouldUseDemoMode()) {
      return demoRepository.expenses.update(id, input);
    }

    const existing = await this.getById(id);
    if (!existing) {
      expenseLogger.warn('Expense not found for update', { id });
      return null;
    }

    const updated: Expense = {
      ...existing,
      ...input,
      projectId: input.projectId === undefined ? existing.projectId : input.projectId || null,
      receiptPath:
        input.receiptPath === undefined ? existing.receiptPath : input.receiptPath || null,
      updatedAt: now(),
    };

    const db = await getDb();
    await db.execute(
      `
      UPDATE expenses SET
        project_id = $1,
        description = $2,
        amount = $3,
        expense_date = $4,
        receipt_path = $5,
        is_billable = $6,
        notes = $7,
        updated_at = $8
      WHERE id = $9
    `,
      [
        updated.projectId,
        updated.description,
        updated.amount,
        updated.expenseDate,
        updated.receiptPath,
        updated.isBillable ? 1 : 0,
        updated.notes,
        updated.updatedAt,
        id,
      ],
    );

    expenseLogger.info('Updated expense', { id });
    return updated;
  },

  async markAsBilled(ids: string[], invoiceId: string): Promise<void> {
    if (ids.length === 0) return;

    if (shouldUseDemoMode()) {
      return demoRepository.expenses.markAsBilled(ids, invoiceId);
    }

    const db = await getDb();
    const placeholders = ids.map((_, index) => `$${index + 2}`).join(', ');
    await db.execute(
      `
      UPDATE expenses
      SET is_billed = 1,
          invoice_id = $1,
          updated_at = datetime('now')
      WHERE id IN (${placeholders})
    `,
      [invoiceId, ...ids],
    );
  },

  async delete(id: string): Promise<boolean> {
    if (shouldUseDemoMode()) {
      return demoRepository.expenses.delete(id);
    }

    const db = await getDb();
    await db.execute('DELETE FROM expenses WHERE id = $1', [id]);
    expenseLogger.info('Deleted expense', { id });
    return true;
  },
};

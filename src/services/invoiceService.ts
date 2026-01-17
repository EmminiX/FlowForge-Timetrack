// Invoice CRUD service

import { getDb } from '../lib/db';
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceWithDetails,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  CreateLineItemInput,
} from '../types';
import { calculateInvoiceTotals } from '../types';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export const invoiceService = {
  // Get all invoices
  async getAll(status?: string): Promise<InvoiceWithDetails[]> {
    const db = await getDb();

    let query = `
      SELECT 
        i.id,
        i.client_id as clientId,
        i.invoice_number as invoiceNumber,
        i.issue_date as issueDate,
        i.due_date as dueDate,
        i.status,
        i.notes,
        i.tax_rate as taxRate,
        i.created_at as createdAt,
        i.updated_at as updatedAt,
        c.name as clientName,
        c.email as clientEmail,
        c.phone as clientPhone,
        c.address as clientAddress,
        c.vat_number as clientVatNumber
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
    `;

    const params: string[] = [];
    if (status) {
      query += ` WHERE i.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY i.created_at DESC`;

    const invoices = await db.select<InvoiceWithDetails[]>(query, params);

    // Load line items for each invoice
    for (const invoice of invoices) {
      const lineItems = await this.getLineItems(invoice.id);
      const totals = calculateInvoiceTotals(lineItems, invoice.taxRate);
      invoice.lineItems = lineItems;
      invoice.subtotal = totals.subtotal;
      invoice.taxAmount = totals.taxAmount;
      invoice.total = totals.total;
    }

    return invoices;
  },

  // Get invoice by ID with full details
  async getById(id: string): Promise<InvoiceWithDetails | null> {
    const db = await getDb();
    const result = await db.select<InvoiceWithDetails[]>(`
      SELECT 
        i.id,
        i.client_id as clientId,
        i.invoice_number as invoiceNumber,
        i.issue_date as issueDate,
        i.due_date as dueDate,
        i.status,
        i.notes,
        i.tax_rate as taxRate,
        i.created_at as createdAt,
        i.updated_at as updatedAt,
        c.name as clientName,
        c.email as clientEmail,
        c.phone as clientPhone,
        c.address as clientAddress,
        c.vat_number as clientVatNumber
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      WHERE i.id = $1
    `, [id]);

    if (!result[0]) return null;

    const invoice = result[0];
    const lineItems = await this.getLineItems(id);
    const totals = calculateInvoiceTotals(lineItems, invoice.taxRate);

    return {
      ...invoice,
      lineItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
    };
  },

  // Get line items for an invoice
  async getLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    const db = await getDb();
    return db.select<InvoiceLineItem[]>(`
      SELECT 
        id,
        invoice_id as invoiceId,
        description,
        quantity,
        unit_price as unitPrice
      FROM invoice_line_items
      WHERE invoice_id = $1
      ORDER BY rowid ASC
    `, [invoiceId]);
  },

  // Create invoice
  async create(input: CreateInvoiceInput, lineItems: CreateLineItemInput[]): Promise<Invoice> {
    const db = await getDb();
    const id = generateId();
    const timestamp = now();

    await db.execute(`
      INSERT INTO invoices (id, client_id, invoice_number, issue_date, due_date, status, notes, tax_rate, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      id,
      input.clientId,
      input.invoiceNumber,
      input.issueDate,
      input.dueDate,
      input.status || 'draft',
      input.notes || '',
      input.taxRate || 0,
      timestamp,
      timestamp,
    ]);

    // Insert line items
    for (const item of lineItems) {
      await this.addLineItem({
        ...item,
        invoiceId: id,
      });
    }

    return {
      id,
      clientId: input.clientId,
      invoiceNumber: input.invoiceNumber,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      status: input.status || 'draft',
      notes: input.notes || '',
      taxRate: input.taxRate || 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  },

  // Update invoice
  async update(id: string, input: UpdateInvoiceInput): Promise<Invoice | null> {
    const db = await getDb();
    const existing = await db.select<Invoice[]>(`
      SELECT 
        id,
        client_id as clientId,
        invoice_number as invoiceNumber,
        issue_date as issueDate,
        due_date as dueDate,
        status,
        notes,
        tax_rate as taxRate,
        created_at as createdAt,
        updated_at as updatedAt
      FROM invoices
      WHERE id = $1
    `, [id]);

    if (!existing[0]) return null;

    const updated = {
      ...existing[0],
      ...input,
      updatedAt: now(),
    };

    await db.execute(`
      UPDATE invoices SET
        invoice_number = $1,
        issue_date = $2,
        due_date = $3,
        status = $4,
        notes = $5,
        tax_rate = $6,
        updated_at = $7
      WHERE id = $8
    `, [
      updated.invoiceNumber,
      updated.issueDate,
      updated.dueDate,
      updated.status,
      updated.notes,
      updated.taxRate,
      updated.updatedAt,
      id,
    ]);

    return updated;
  },

  // Add line item
  async addLineItem(input: CreateLineItemInput & { invoiceId: string }): Promise<InvoiceLineItem> {
    const db = await getDb();
    const id = generateId();

    await db.execute(`
      INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit_price)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      id,
      input.invoiceId,
      input.description,
      input.quantity,
      input.unitPrice,
    ]);

    return {
      id,
      invoiceId: input.invoiceId,
      description: input.description,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
    };
  },

  // Delete line item
  async deleteLineItem(id: string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM invoice_line_items WHERE id = $1', [id]);
  },

  // Replace all line items for an invoice
  async replaceLineItems(invoiceId: string, lineItems: CreateLineItemInput[]): Promise<void> {
    const db = await getDb();

    // Delete existing
    await db.execute('DELETE FROM invoice_line_items WHERE invoice_id = $1', [invoiceId]);

    // Insert new
    for (const item of lineItems) {
      await this.addLineItem({
        ...item,
        invoiceId,
      });
    }
  },

  // Delete invoice
  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    await db.execute('DELETE FROM invoices WHERE id = $1', [id]);
    return true;
  },

  // Get all invoices for generating next number
  async getAllForNumbering(): Promise<Invoice[]> {
    const db = await getDb();
    return db.select<Invoice[]>(`
      SELECT 
        id,
        client_id as clientId,
        invoice_number as invoiceNumber,
        issue_date as issueDate,
        due_date as dueDate,
        status,
        notes,
        tax_rate as taxRate,
        created_at as createdAt,
        updated_at as updatedAt
      FROM invoices
    `);
  },
};

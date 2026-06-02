import { getDb } from '../lib/db';
import { shouldUseDemoMode } from '../lib/platform';
import type {
  CreateInvoiceEventInput,
  CreateInvoicePaymentInput,
  InvoiceEvent,
  InvoicePayment,
  InvoicePaymentSummary,
} from '../types';
import { demoRepository } from './demoRepository';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export const invoicePaymentService = {
  async getPayments(invoiceId: string): Promise<InvoicePayment[]> {
    if (shouldUseDemoMode()) {
      return demoRepository.invoicePayments.getPayments(invoiceId);
    }

    const db = await getDb();
    return db.select<InvoicePayment[]>(
      `
        SELECT
          id,
          invoice_id as invoiceId,
          amount,
          payment_date as paymentDate,
          method,
          reference,
          notes,
          created_at as createdAt
        FROM invoice_payments
        WHERE invoice_id = $1
        ORDER BY payment_date DESC, created_at DESC
      `,
      [invoiceId],
    );
  },

  async getEvents(invoiceId: string): Promise<InvoiceEvent[]> {
    if (shouldUseDemoMode()) {
      return demoRepository.invoicePayments.getEvents(invoiceId);
    }

    const db = await getDb();
    return db.select<InvoiceEvent[]>(
      `
        SELECT
          id,
          invoice_id as invoiceId,
          event_type as eventType,
          event_date as eventDate,
          message,
          created_at as createdAt
        FROM invoice_events
        WHERE invoice_id = $1
        ORDER BY event_date DESC, created_at DESC
      `,
      [invoiceId],
    );
  },

  async getSummary(invoiceId: string, invoiceTotal: number): Promise<InvoicePaymentSummary> {
    const payments = await this.getPayments(invoiceId);
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const balanceDue = Math.max(0, invoiceTotal - totalPaid);

    return {
      payments,
      totalPaid,
      balanceDue,
      isPaid: balanceDue <= 0,
    };
  },

  async recordEvent(input: CreateInvoiceEventInput): Promise<InvoiceEvent> {
    if (shouldUseDemoMode()) {
      return demoRepository.invoicePayments.recordEvent(input);
    }

    const db = await getDb();
    const event: InvoiceEvent = {
      id: generateId(),
      invoiceId: input.invoiceId,
      eventType: input.eventType,
      eventDate: input.eventDate,
      message: input.message,
      createdAt: now(),
    };

    await db.execute(
      `
        INSERT INTO invoice_events (id, invoice_id, event_type, event_date, message, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [event.id, event.invoiceId, event.eventType, event.eventDate, event.message, event.createdAt],
    );

    return event;
  },

  async sendReminder(invoiceId: string): Promise<InvoiceEvent> {
    return this.recordEvent({
      invoiceId,
      eventType: 'reminder',
      eventDate: now(),
      message: 'Reminder sent',
    });
  },

  async recordPayment(
    input: CreateInvoicePaymentInput,
    invoiceTotal: number,
  ): Promise<InvoicePayment> {
    if (shouldUseDemoMode()) {
      return demoRepository.invoicePayments.recordPayment(input, invoiceTotal);
    }

    const db = await getDb();
    const totalRows = await db.select<{ totalPaid: number | null }[]>(
      'SELECT COALESCE(SUM(amount), 0) as totalPaid FROM invoice_payments WHERE invoice_id = $1',
      [input.invoiceId],
    );
    const totalPaidAfter = (totalRows[0]?.totalPaid ?? 0) + input.amount;
    const payment: InvoicePayment = {
      id: generateId(),
      invoiceId: input.invoiceId,
      amount: input.amount,
      paymentDate: input.paymentDate,
      method: input.method,
      reference: input.reference || '',
      notes: input.notes || '',
      createdAt: now(),
    };

    await db.execute(
      `
        INSERT INTO invoice_payments (
          id, invoice_id, amount, payment_date, method, reference, notes, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        payment.id,
        payment.invoiceId,
        payment.amount,
        payment.paymentDate,
        payment.method,
        payment.reference,
        payment.notes,
        payment.createdAt,
      ],
    );

    const paidInFull = totalPaidAfter >= invoiceTotal;
    await this.recordEvent({
      invoiceId: input.invoiceId,
      eventType: paidInFull ? 'paid' : 'partial_payment',
      eventDate: now(),
      message: paidInFull ? 'Invoice paid' : `Payment recorded: ${input.amount.toFixed(2)}`,
    });

    if (paidInFull) {
      await db.execute(
        `
          UPDATE invoices
          SET status = 'paid', updated_at = $2
          WHERE id = $1
        `,
        [input.invoiceId, now()],
      );
    }

    return payment;
  },
};

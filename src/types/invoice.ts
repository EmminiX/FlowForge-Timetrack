// Invoice data models

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
    id: string;
    clientId: string;
    invoiceNumber: string; // e.g., INV-2026-0001
    issueDate: string; // ISO date
    dueDate: string; // ISO date
    status: InvoiceStatus;
    notes: string;
    taxRate: number; // decimal, e.g., 0.20 for 20%
    createdAt: string;
    updatedAt: string;
}

export interface InvoiceLineItem {
    id: string;
    invoiceId: string;
    description: string;
    quantity: number;
    unitPrice: number;
}

export interface InvoiceWithDetails extends Invoice {
    clientName: string;
    clientEmail: string;
    clientAddress: string;
    lineItems: InvoiceLineItem[];
    subtotal: number;
    taxAmount: number;
    total: number;
}

export type CreateInvoiceInput = Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateInvoiceInput = Partial<Omit<CreateInvoiceInput, 'clientId'>>;

export type CreateLineItemInput = Omit<InvoiceLineItem, 'id'>;

export const INVOICE_STATUS_OPTIONS: { value: InvoiceStatus; label: string; color: string }[] = [
    { value: 'draft', label: 'Draft', color: '#8E8E93' },
    { value: 'sent', label: 'Sent', color: '#007AFF' },
    { value: 'paid', label: 'Paid', color: '#34C759' },
    { value: 'overdue', label: 'Overdue', color: '#FF3B30' },
    { value: 'cancelled', label: 'Cancelled', color: '#8E8E93' },
];

// Generate next invoice number
export function generateInvoiceNumber(existingInvoices: Invoice[]): string {
    const year = new Date().getFullYear();
    const existingNumbers = existingInvoices
        .map((inv) => {
            const match = inv.invoiceNumber.match(/INV-(\d+)-(\d+)/);
            if (match && parseInt(match[1]) === year) {
                return parseInt(match[2]);
            }
            return 0;
        })
        .filter((n) => n > 0);

    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    return `INV-${year}-${(maxNumber + 1).toString().padStart(4, '0')}`;
}

// Calculate invoice totals
export function calculateInvoiceTotals(lineItems: InvoiceLineItem[], taxRate: number) {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
}

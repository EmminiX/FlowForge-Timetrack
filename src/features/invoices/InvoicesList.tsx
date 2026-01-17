import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, FileText, Eye, Download, Trash2 } from 'lucide-react';
import type { InvoiceWithDetails, Client } from '../../types';
import { INVOICE_STATUS_OPTIONS, generateInvoiceNumber, calculateInvoiceTotals } from '../../types';
import { invoiceService, clientService, projectService, timeEntryService } from '../../services';
import { invoiceLogger } from '../../lib/logger';
import { Button, Card, EmptyState, ConfirmDialog, StatusBadge, Select, Modal, ModalFooter, Input, Textarea } from '../../components/ui';

export function InvoicesList() {
    const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('');

    // Modal states
    const [showCreate, setShowCreate] = useState(false);
    const [viewingInvoice, setViewingInvoice] = useState<InvoiceWithDetails | null>(null);
    const [deletingInvoice, setDeletingInvoice] = useState<InvoiceWithDetails | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const [invoicesData, clientsData] = await Promise.all([
                invoiceService.getAll(statusFilter || undefined),
                clientService.getAll(),
            ]);
            setInvoices(invoicesData);
            setClients(clientsData);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [statusFilter]);

    const handleDelete = async () => {
        if (!deletingInvoice) return;
        setSubmitting(true);
        try {
            await invoiceService.delete(deletingInvoice.id);
            await loadData();
            setDeletingInvoice(null);
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const statusOptions = [
        { value: '', label: 'All Statuses' },
        ...INVOICE_STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
                <Button onClick={() => setShowCreate(true)} disabled={clients.length === 0}>
                    <Plus className="w-4 h-4" />
                    New Invoice
                </Button>
            </div>

            {/* Filter */}
            {invoices.length > 0 && (
                <div className="w-48">
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        options={statusOptions}
                    />
                </div>
            )}

            {/* List */}
            {invoices.length === 0 && !statusFilter ? (
                <EmptyState
                    icon={<FileText className="w-8 h-8" />}
                    title="No invoices yet"
                    description={clients.length === 0
                        ? "Create a client first to generate invoices."
                        : "Create your first invoice to get started."
                    }
                    action={clients.length > 0 ? (
                        <Button onClick={() => setShowCreate(true)}>
                            <Plus className="w-4 h-4" />
                            Create Invoice
                        </Button>
                    ) : undefined}
                />
            ) : invoices.length === 0 ? (
                <EmptyState
                    icon={<Search className="w-8 h-8" />}
                    title="No matching invoices"
                    description="Try selecting a different status filter."
                />
            ) : (
                <div className="space-y-3">
                    {invoices.map((invoice) => (
                        <Card key={invoice.id} className="flex items-center gap-4 p-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-medium text-foreground">
                                        {invoice.invoiceNumber}
                                    </span>
                                    <StatusBadge status={invoice.status} />
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                    {invoice.clientName}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="font-medium text-foreground">
                                    {formatCurrency(invoice.total)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Due {formatDate(invoice.dueDate)}
                                </p>
                            </div>

                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewingInvoice(invoice)}
                                    aria-label="View invoice"
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingInvoice(invoice)}
                                    aria-label="Delete invoice"
                                >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Invoice Modal */}
            <CreateInvoiceModal
                isOpen={showCreate}
                onClose={() => setShowCreate(false)}
                clients={clients}
                onCreated={loadData}
            />

            {/* Invoice Preview */}
            {viewingInvoice && (
                <InvoicePreview
                    invoice={viewingInvoice}
                    onClose={() => setViewingInvoice(null)}
                />
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deletingInvoice}
                onClose={() => setDeletingInvoice(null)}
                onConfirm={handleDelete}
                title="Delete Invoice"
                message={`Are you sure you want to delete invoice ${deletingInvoice?.invoiceNumber}?`}
                confirmLabel="Delete"
                variant="danger"
                loading={submitting}
            />
        </div>
    );
}

// Create Invoice Modal Component
interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    clients: Client[];
    onCreated: () => void;
}

function CreateInvoiceModal({ isOpen, onClose, clients, onCreated }: CreateInvoiceModalProps) {
    const [step, setStep] = useState(1);
    const [clientId, setClientId] = useState('');
    const [lineItems, setLineItems] = useState<{ description: string; quantity: number; unitPrice: number }[]>([]);
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [taxRate, setTaxRate] = useState(0);
    const [saving, setSaving] = useState(false);

    // Reset form when opened
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setClientId('');
            setLineItems([]);
            setIssueDate(new Date().toISOString().split('T')[0]);
            setDueDate('');
            setNotes('');
            setTaxRate(0);
        }
    }, [isOpen]);

    // Set default due date when issue date changes
    useEffect(() => {
        if (issueDate) {
            const due = new Date(issueDate);
            due.setDate(due.getDate() + 30);
            setDueDate(due.toISOString().split('T')[0]);
        }
    }, [issueDate]);

    const handleLoadHours = async () => {
        if (!clientId) return;

        invoiceLogger.info('handleLoadHours called', { clientId });

        // Get projects for this client
        const projects = await projectService.getByClientId(clientId);
        invoiceLogger.debug('Found projects for client', { clientId, projectCount: projects.length, projects: projects.map(p => ({ id: p.id, name: p.name })) });

        const client = clients.find((c) => c.id === clientId);
        const hourlyRate = client?.hourlyRate || 0;
        invoiceLogger.debug('Client hourly rate', { hourlyRate });

        const items: typeof lineItems = [];

        for (const project of projects) {
            invoiceLogger.debug('Fetching unbilled entries for project', { projectId: project.id, projectName: project.name });
            const unbilled = await timeEntryService.getUnbilledByProject(project.id);
            invoiceLogger.debug('Unbilled entries found', { projectId: project.id, count: unbilled.length });

            if (unbilled.length === 0) continue;

            // Calculate total hours for this project
            const totalSeconds = unbilled.reduce((sum, entry) => {
                if (!entry.endTime) return sum;
                const duration = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 1000 - entry.pauseDuration;
                return sum + Math.max(0, duration);
            }, 0);

            const hours = totalSeconds / 3600;
            invoiceLogger.debug('Total hours calculated', { projectId: project.id, hours });

            if (hours > 0) {
                items.push({
                    description: `${project.name} - ${hours.toFixed(2)} hours`,
                    quantity: parseFloat(hours.toFixed(2)),
                    unitPrice: hourlyRate,
                });
            }
        }

        invoiceLogger.info('handleLoadHours completed', { itemCount: items.length, items });

        if (items.length > 0) {
            setLineItems(items);
        } else {
            // Add empty line item
            setLineItems([{ description: '', quantity: 1, unitPrice: 0 }]);
        }
    };

    const handleAddLineItem = () => {
        setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }]);
    };

    const handleRemoveLineItem = (index: number) => {
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    const handleLineItemChange = (index: number, field: string, value: string | number) => {
        const updated = [...lineItems];
        (updated[index] as any)[field] = value;
        setLineItems(updated);
    };

    const totals = useMemo(() => calculateInvoiceTotals(
        lineItems.map((item) => ({ ...item, id: '', invoiceId: '' })),
        taxRate / 100
    ), [lineItems, taxRate]);

    const handleCreate = async () => {
        setSaving(true);
        try {
            // Get all invoices to generate number
            const allInvoices = await invoiceService.getAllForNumbering();
            const invoiceNumber = generateInvoiceNumber(allInvoices);

            await invoiceService.create(
                {
                    clientId,
                    invoiceNumber,
                    issueDate,
                    dueDate,
                    status: 'draft',
                    notes,
                    taxRate: taxRate / 100,
                },
                lineItems.map((item) => ({
                    invoiceId: '',
                    ...item,
                }))
            );

            onCreated();
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Invoice" size="xl">
            {step === 1 && (
                <div className="space-y-4">
                    <Select
                        label="Client *"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        options={clientOptions}
                        placeholder="Select a client..."
                    />

                    <ModalFooter>
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button
                            onClick={() => { handleLoadHours(); setStep(2); }}
                            disabled={!clientId}
                        >
                            Next: Add Line Items
                        </Button>
                    </ModalFooter>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Line Items</label>
                        {lineItems.map((item, index) => (
                            <div key={index} className="flex gap-2 items-start">
                                <Input
                                    placeholder="Description"
                                    value={item.description}
                                    onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                                    className="flex-1"
                                />
                                <Input
                                    type="number"
                                    placeholder="Qty"
                                    value={item.quantity}
                                    onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="w-20"
                                    min={0}
                                    step={0.01}
                                />
                                <Input
                                    type="number"
                                    placeholder="Price"
                                    value={item.unitPrice}
                                    onChange={(e) => handleLineItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                    className="w-24"
                                    min={0}
                                    step={0.01}
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveLineItem(index)}
                                    disabled={lineItems.length === 1}
                                >
                                    ×
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={handleAddLineItem}>
                            + Add Line
                        </Button>
                    </div>

                    <ModalFooter>
                        <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                        <Button onClick={() => setStep(3)} disabled={lineItems.length === 0}>
                            Next: Details
                        </Button>
                    </ModalFooter>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Issue Date"
                            type="date"
                            value={issueDate}
                            onChange={(e) => setIssueDate(e.target.value)}
                        />
                        <Input
                            label="Due Date"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>

                    <Input
                        label="Tax Rate (%)"
                        type="number"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        min={0}
                        max={100}
                        step={0.1}
                    />

                    <Textarea
                        label="Notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes for the invoice..."
                        rows={2}
                    />

                    <div className="p-4 bg-secondary rounded-lg">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>${totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Tax ({taxRate}%):</span>
                            <span>${totals.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium mt-2 pt-2 border-t border-border">
                            <span>Total:</span>
                            <span>${totals.total.toFixed(2)}</span>
                        </div>
                    </div>

                    <ModalFooter>
                        <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                        <Button onClick={handleCreate} loading={saving}>
                            Create Invoice
                        </Button>
                    </ModalFooter>
                </div>
            )}
        </Modal>
    );
}

// Invoice Preview Component
interface InvoicePreviewProps {
    invoice: InvoiceWithDetails;
    onClose: () => void;
}

function InvoicePreview({ invoice, onClose }: InvoicePreviewProps) {
    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const handleExportPDF = () => {
        invoiceLogger.info('Exporting invoice to PDF', { invoiceNumber: invoice.invoiceNumber });

        // Create a printable version of the invoice
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice ${invoice.invoiceNumber}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                    h1 { font-size: 24px; margin-bottom: 20px; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .client-info { color: #666; }
                    .invoice-meta { text-align: right; }
                    .status { display: inline-block; padding: 4px 12px; border-radius: 4px; background: #e0e0e0; font-size: 12px; text-transform: uppercase; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
                    th { background: #f5f5f5; }
                    .text-right { text-align: right; }
                    .totals { width: 250px; margin-left: auto; }
                    .totals .row { display: flex; justify-content: space-between; padding: 8px 0; }
                    .totals .total { border-top: 2px solid #333; font-weight: bold; }
                    .notes { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <h1>INVOICE</h1>
                <div class="header">
                    <div class="client-info">
                        <strong>Bill To:</strong><br/>
                        ${invoice.clientName}<br/>
                        ${invoice.clientAddress ? invoice.clientAddress.replace(/\n/g, '<br/>') : ''}
                    </div>
                    <div class="invoice-meta">
                        <div><strong>Invoice #:</strong> ${invoice.invoiceNumber}</div>
                        <div><strong>Issue Date:</strong> ${formatDate(invoice.issueDate)}</div>
                        <div><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</div>
                        <div class="status">${invoice.status}</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th class="text-right">Qty</th>
                            <th class="text-right">Price</th>
                            <th class="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.lineItems.map(item => `
                            <tr>
                                <td>${item.description}</td>
                                <td class="text-right">${item.quantity}</td>
                                <td class="text-right">$${item.unitPrice.toFixed(2)}</td>
                                <td class="text-right">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="totals">
                    <div class="row"><span>Subtotal:</span><span>$${invoice.subtotal.toFixed(2)}</span></div>
                    <div class="row"><span>Tax (${(invoice.taxRate * 100).toFixed(1)}%):</span><span>$${invoice.taxAmount.toFixed(2)}</span></div>
                    <div class="row total"><span>Total:</span><span>$${invoice.total.toFixed(2)}</span></div>
                </div>
                ${invoice.notes ? `<div class="notes"><strong>Notes:</strong><br/>${invoice.notes}</div>` : ''}
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            // Give it a moment to render, then print
            setTimeout(() => {
                printWindow.print();
            }, 250);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={invoice.invoiceNumber} size="lg">
            <div className="space-y-4 text-sm">
                {/* Header */}
                <div className="flex justify-between">
                    <div>
                        <p className="font-medium text-foreground">Bill To:</p>
                        <p className="text-muted-foreground">{invoice.clientName}</p>
                        {invoice.clientAddress && (
                            <p className="text-muted-foreground whitespace-pre-line">{invoice.clientAddress}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <StatusBadge status={invoice.status} />
                        <p className="mt-2 text-muted-foreground">Issue: {formatDate(invoice.issueDate)}</p>
                        <p className="text-muted-foreground">Due: {formatDate(invoice.dueDate)}</p>
                    </div>
                </div>

                {/* Line Items */}
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border text-left">
                            <th className="py-2">Description</th>
                            <th className="py-2 text-right">Qty</th>
                            <th className="py-2 text-right">Price</th>
                            <th className="py-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.lineItems.map((item) => (
                            <tr key={item.id} className="border-b border-border">
                                <td className="py-2">{item.description}</td>
                                <td className="py-2 text-right">{item.quantity}</td>
                                <td className="py-2 text-right">${item.unitPrice.toFixed(2)}</td>
                                <td className="py-2 text-right">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-48">
                        <div className="flex justify-between py-1">
                            <span>Subtotal:</span>
                            <span>${invoice.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span>Tax ({(invoice.taxRate * 100).toFixed(1)}%):</span>
                            <span>${invoice.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-t border-border font-medium">
                            <span>Total:</span>
                            <span>${invoice.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {invoice.notes && (
                    <div className="pt-4 border-t border-border">
                        <p className="font-medium">Notes:</p>
                        <p className="text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
                    </div>
                )}
            </div>

            <ModalFooter>
                <Button variant="outline" onClick={onClose}>Close</Button>
                <Button onClick={handleExportPDF}>
                    <Download className="w-4 h-4" />
                    Export PDF
                </Button>
            </ModalFooter>
        </Modal>
    );
}

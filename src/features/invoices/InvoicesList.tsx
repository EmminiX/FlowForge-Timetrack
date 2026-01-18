import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, FileText, Eye, Download, Trash2, Pencil } from 'lucide-react';
import type { InvoiceWithDetails, Client, AppSettings } from '../../types';
import { INVOICE_STATUS_OPTIONS, generateInvoiceNumber, calculateInvoiceTotals } from '../../types';
import { invoiceService, clientService, projectService, timeEntryService, settingsService } from '../../services';
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
    const [editingInvoice, setEditingInvoice] = useState<InvoiceWithDetails | null>(null);
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
        } catch (error) {
            console.error('Failed to delete invoice:', error);
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
                                    onClick={() => setEditingInvoice(invoice)}
                                    aria-label="Edit invoice"
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>
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

            {/* Edit Invoice Modal */}
            {editingInvoice && (
                <CreateInvoiceModal
                    isOpen={true}
                    onClose={() => setEditingInvoice(null)}
                    clients={clients}
                    onCreated={loadData}
                    initialData={editingInvoice}
                />
            )}

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

// Create/Edit Invoice Modal Component
interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    clients: Client[];
    onCreated: () => void;
    initialData?: InvoiceWithDetails | null;
}

function CreateInvoiceModal({ isOpen, onClose, clients, onCreated, initialData }: CreateInvoiceModalProps) {
    const [step, setStep] = useState(1);
    const [clientId, setClientId] = useState('');
    const [lineItems, setLineItems] = useState<{ description: string; quantity: number; unitPrice: number; timeEntryIds?: string[] }[]>([]);
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [taxRate, setTaxRate] = useState(0);
    const [saving, setSaving] = useState(false);

    // Reset form when opened and load settings or initial data
    useEffect(() => {
        if (isOpen) {
            setStep(1);

            if (initialData) {
                // Editing mode
                setClientId(initialData.clientId);
                setLineItems(initialData.lineItems.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice
                })));
                setIssueDate(initialData.issueDate);
                setDueDate(initialData.dueDate);
                setNotes(initialData.notes || '');
                setTaxRate(initialData.taxRate * 100);
            } else {
                // Creation mode
                setClientId('');
                setLineItems([]);

                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                const due = new Date(today);
                due.setDate(due.getDate() + 30);
                const dueStr = due.toISOString().split('T')[0];

                setIssueDate(todayStr);
                setDueDate(dueStr);
                setNotes('');

                // Load default options from settings
                settingsService.load().then(settings => {
                    if (settings.defaultTaxRate !== undefined) {
                        setTaxRate(settings.defaultTaxRate * 100);
                    } else {
                        setTaxRate(0);
                    }
                }).catch(console.error);
            }
        }
    }, [isOpen, initialData]);

    const handleLoadHours = async () => {
        if (!clientId) return;

        invoiceLogger.info('handleLoadHours called', { clientId });

        // Get projects for this client
        const projects = await projectService.getByClientId(clientId);
        const client = clients.find((c) => c.id === clientId);
        const hourlyRate = client?.hourlyRate || 0;

        const items: typeof lineItems = [];

        for (const project of projects) {
            const unbilled = await timeEntryService.getUnbilledByProject(project.id);
            if (unbilled.length === 0) continue;

            const entryIds: string[] = [];
            unbilled.forEach(e => entryIds.push(e.id));

            const totalSeconds = unbilled.reduce((sum, entry) => {
                if (!entry.endTime) return sum;
                const duration = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 1000 - entry.pauseDuration;
                return sum + Math.max(0, duration);
            }, 0);

            const hours = totalSeconds / 3600;

            if (hours > 0) {
                items.push({
                    description: `${project.name} - ${hours.toFixed(2)} hours`,
                    quantity: parseFloat(hours.toFixed(2)),
                    unitPrice: hourlyRate,
                    timeEntryIds: entryIds,
                });
            }
        }

        if (items.length > 0) {
            // Append to existing items if editing, or replace if empty
            if (lineItems.length > 0 && (lineItems.length > 1 || lineItems[0].description !== '')) {
                setLineItems([...lineItems, ...items]);
            } else {
                setLineItems(items);
            }
        } else if (lineItems.length === 0) {
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

    const handleSubmit = async () => {
        setSaving(true);
        try {
            // Prepare line items for saving (strip timeEntryIds)
            const lineItemsToSave = lineItems.map(({ timeEntryIds, ...item }) => item);

            // Collect IDs to mark as billed from the remaining line items
            const idsToMarkBilled = lineItems.reduce<string[]>((acc, item) => {
                if (item.timeEntryIds) {
                    return [...acc, ...item.timeEntryIds];
                }
                return acc;
            }, []);

            if (initialData) {
                // Update
                await invoiceService.update(initialData.id, {
                    invoiceNumber: initialData.invoiceNumber, // Keep existing number
                    issueDate,
                    dueDate,
                    status: initialData.status, // Keep existing status or allow change? Usually keep for edits unless explicit.
                    notes,
                    taxRate: taxRate / 100,
                });

                await invoiceService.replaceLineItems(initialData.id, lineItemsToSave.map(item => ({
                    ...item,
                    invoiceId: initialData.id
                })));
            } else {
                // Create
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
                    lineItemsToSave.map((item) => ({
                        invoiceId: '',
                        ...item,
                    }))
                );
            }

            // Mark entries as billed if any were linked to the submitted line items
            if (idsToMarkBilled.length > 0) {
                await timeEntryService.markAsBilled(idsToMarkBilled);
            }

            onCreated();
            onClose();
        } catch (err) {
            console.error('Failed to save invoice:', err);
        } finally {
            setSaving(false);
        }
    };

    const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Invoice" : "Create Invoice"} size="xl">
            {step === 1 && (
                <div className="space-y-4">
                    <Select
                        label="Client *"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        options={clientOptions}
                        placeholder="Select a client..."
                        disabled={!!initialData} // Lock client on edit
                    />

                    <ModalFooter>
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button
                            onClick={() => {
                                if (!initialData) handleLoadHours(); // Only auto-load on create
                                setStep(2);
                            }}
                            disabled={!clientId}
                        >
                            Next: Line Items
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
                                    value={item.quantity || ''}
                                    onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                    className="w-20"
                                    min={0}
                                    step={0.01}
                                />
                                <Input
                                    type="number"
                                    placeholder="Price"
                                    value={item.unitPrice || ''}
                                    onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))}
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
                        {!initialData && (
                            <Button variant="ghost" size="sm" onClick={handleLoadHours} className="ml-2">
                                Reload Hours
                            </Button>
                        )}
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
                        value={taxRate || ''}
                        onChange={(e) => setTaxRate(e.target.value === '' ? 0 : parseFloat(e.target.value))}
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
                        <Button onClick={handleSubmit} loading={saving}>
                            {initialData ? "Save Changes" : "Create Invoice"}
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
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        settingsService.load().then(setSettings).catch(console.error);
    }, []);

    const formatDate = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return 'Invalid Date';
        }
    };

    const handleExportPDF = async () => {
        invoiceLogger.info('Exporting invoice to PDF', { invoiceNumber: invoice.invoiceNumber });
        setExporting(true);

        try {
            // Import jspdf dynamically
            const { jsPDF } = await import('jspdf');

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            let y = 20;

            // Logo (if set)
            if (settings?.businessLogo) {
                try {
                    doc.addImage(settings.businessLogo, 'PNG', 15, y, 40, 20);
                    y += 25;
                } catch (e) {
                    invoiceLogger.warn('Failed to add logo to PDF', { error: e });
                }
            }

            // Business Info Header (left side)
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('INVOICE', 15, y);
            y += 10;

            if (settings?.businessName) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(settings.businessName, 15, y);
                y += 5;
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            if (settings?.businessAddress) {
                const addressLines = settings.businessAddress.split('\n');
                addressLines.forEach(line => {
                    doc.text(line, 15, y);
                    y += 4;
                });
            }
            if (settings?.businessEmail) {
                doc.text(settings.businessEmail, 15, y);
                y += 4;
            }
            if (settings?.businessPhone) {
                doc.text(settings.businessPhone, 15, y);
                y += 4;
            }
            if (settings?.businessVatNumber) {
                doc.text(`VAT: ${settings.businessVatNumber}`, 15, y);
                y += 4;
            }

            // Invoice details (right side)
            const rightX = pageWidth - 60;
            let rightY = 20;
            if (settings?.businessLogo) rightY += 25;

            // Calculate due date if invalid
            let displayDueDate = formatDate(invoice.dueDate);
            if (displayDueDate === 'Invalid Date' && invoice.issueDate) {
                const issueDate = new Date(invoice.issueDate);
                const dueDate = new Date(issueDate);
                dueDate.setDate(issueDate.getDate() + 30);
                displayDueDate = formatDate(dueDate.toISOString());
            }

            // Determine status display
            const displayStatus = invoice.status === 'draft' ? 'ISSUED' : invoice.status.toUpperCase();

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Invoice #: ${invoice.invoiceNumber}`, rightX, rightY);
            rightY += 6;
            doc.setFont('helvetica', 'normal');
            doc.text(`Issue Date: ${formatDate(invoice.issueDate)}`, rightX, rightY);
            rightY += 5;
            doc.text(`Due Date: ${displayDueDate}`, rightX, rightY);
            rightY += 5;
            doc.text(`Status: ${displayStatus}`, rightX, rightY);

            y = Math.max(y, rightY) + 15;

            // Bill To section
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Bill To:', 15, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(invoice.clientName, 15, y);
            y += 5;
            if (invoice.clientAddress) {
                const clientLines = invoice.clientAddress.split('\n');
                clientLines.forEach(line => {
                    doc.text(line, 15, y);
                    y += 4;
                });
            }
            if (invoice.clientEmail) {
                doc.text(invoice.clientEmail, 15, y);
                y += 4;
            }
            if (invoice.clientPhone) {
                doc.text(invoice.clientPhone, 15, y);
                y += 4;
            }
            if (invoice.clientVatNumber) {
                doc.text(`VAT: ${invoice.clientVatNumber}`, 15, y);
                y += 4;
            }
            y += 10;

            // Table Header
            doc.setFillColor(240, 240, 240);
            doc.rect(15, y - 4, pageWidth - 30, 8, 'F');
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Description', 17, y);
            doc.text('Qty', pageWidth - 75, y, { align: 'right' });
            doc.text('Price', pageWidth - 50, y, { align: 'right' });
            doc.text('Amount', pageWidth - 17, y, { align: 'right' });
            y += 8;

            // Table Body
            doc.setFont('helvetica', 'normal');
            invoice.lineItems.forEach(item => {
                doc.text(item.description.substring(0, 50), 17, y);
                doc.text(item.quantity.toString(), pageWidth - 75, y, { align: 'right' });
                doc.text(`$${item.unitPrice.toFixed(2)}`, pageWidth - 50, y, { align: 'right' });
                doc.text(`$${(item.quantity * item.unitPrice).toFixed(2)}`, pageWidth - 17, y, { align: 'right' });
                y += 6;
            });

            // Totals
            y += 5;
            doc.setDrawColor(200, 200, 200);
            doc.line(pageWidth - 80, y, pageWidth - 15, y);
            y += 8;

            doc.text('Subtotal:', pageWidth - 60, y);
            doc.text(`$${invoice.subtotal.toFixed(2)}`, pageWidth - 17, y, { align: 'right' });
            y += 6;

            doc.text(`Tax (${(invoice.taxRate * 100).toFixed(1)}%):`, pageWidth - 60, y);
            doc.text(`$${invoice.taxAmount.toFixed(2)}`, pageWidth - 17, y, { align: 'right' });
            y += 6;

            doc.setFont('helvetica', 'bold');
            doc.text('Total:', pageWidth - 60, y);
            doc.text(`$${invoice.total.toFixed(2)}`, pageWidth - 17, y, { align: 'right' });
            y += 15;

            // Notes
            if (invoice.notes) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text('Notes:', 15, y);
                y += 5;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - 30);
                doc.text(noteLines, 15, y);
                y += noteLines.length * 4 + 5;
            }

            // Payment Terms
            if (settings?.paymentTerms) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text('Payment Terms:', 15, y);
                y += 5;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                const termLines = doc.splitTextToSize(settings.paymentTerms, pageWidth - 30);
                doc.text(termLines, 15, y);
                y += termLines.length * 4 + 5;
            }

            // Payment Links
            const drawLink = (label: string, url: string) => {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.setTextColor(0, 0, 0); // Black for title
                doc.text(label, 15, y);
                y += 6;

                // Show full URL in small text, blue and clickable
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 238); // Blue for link
                doc.textWithLink(url, 15, y, { url });
                doc.setTextColor(0, 0, 0); // Reset
                y += 8;
            };

            if (settings?.paymentLink) {
                drawLink(settings.paymentLinkTitle || 'Payment Link 1', settings.paymentLink);
            }

            if (settings?.paymentLink2) {
                drawLink(settings.paymentLink2Title || 'Payment Link 2', settings.paymentLink2);
            }

            // Get PDF as bytes
            const pdfOutput = doc.output('arraybuffer');

            // Check if we're in Tauri environment
            const isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window;

            if (isTauri) {
                // Open native save dialog
                const { save } = await import('@tauri-apps/plugin-dialog');
                const { writeFile } = await import('@tauri-apps/plugin-fs');

                invoiceLogger.debug('Opening save dialog...');
                const filePath = await save({
                    defaultPath: `${invoice.invoiceNumber}.pdf`,
                    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
                });

                invoiceLogger.debug('Save dialog returned', { filePath });

                if (filePath) {
                    invoiceLogger.debug('Writing file...', { path: filePath, size: pdfOutput.byteLength });
                    try {
                        await writeFile(filePath, new Uint8Array(pdfOutput));
                        invoiceLogger.info('PDF saved successfully', { path: filePath });
                        alert(`Invoice saved to:\n${filePath}`);
                    } catch (writeError) {
                        invoiceLogger.error('writeFile failed', writeError);
                        throw writeError;
                    }
                } else {
                    invoiceLogger.info('Save dialog cancelled');
                }
            } else {
                // Fallback for browser: download via blob
                invoiceLogger.info('Not in Tauri environment, using browser download');
                const blob = new Blob([pdfOutput], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${invoice.invoiceNumber}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            invoiceLogger.error('Failed to export PDF', error);
            console.error('Failed to export PDF:', error);
            alert(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setExporting(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={invoice.invoiceNumber} size="lg">
            <div className="space-y-4 text-sm">
                {/* Business Header */}
                {settings && (settings.businessName || settings.businessLogo) && (
                    <div className="pb-4 border-b border-border">
                        <div className="flex items-start gap-4">
                            {settings.businessLogo && (
                                <img
                                    src={settings.businessLogo}
                                    alt="Business Logo"
                                    className="w-16 h-16 object-contain"
                                />
                            )}
                            <div>
                                {settings.businessName && (
                                    <p className="font-bold text-lg text-foreground">{settings.businessName}</p>
                                )}
                                {settings.businessAddress && (
                                    <p className="text-muted-foreground whitespace-pre-line text-xs">{settings.businessAddress}</p>
                                )}
                                {settings.businessEmail && (
                                    <p className="text-muted-foreground text-xs">{settings.businessEmail}</p>
                                )}
                                {settings.businessPhone && (
                                    <p className="text-muted-foreground text-xs">{settings.businessPhone}</p>
                                )}
                                {settings.businessVatNumber && (
                                    <p className="text-muted-foreground text-xs">VAT: {settings.businessVatNumber}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Invoice Info Row */}
                <div className="flex justify-between">
                    <div>
                        <p className="font-medium text-foreground">Bill To:</p>
                        <p className="text-muted-foreground">{invoice.clientName}</p>
                        {invoice.clientAddress && (
                            <p className="text-muted-foreground whitespace-pre-line">{invoice.clientAddress}</p>
                        )}
                        {invoice.clientVatNumber && (
                            <p className="text-muted-foreground">VAT: {invoice.clientVatNumber}</p>
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

                {settings?.paymentTerms && (
                    <div className="pt-4 border-t border-border">
                        <p className="font-medium">Payment Terms:</p>
                        <p className="text-muted-foreground whitespace-pre-line">{settings.paymentTerms}</p>
                    </div>
                )}

                {settings?.paymentLink && (
                    <div className="pt-4 border-t border-border">
                        <p className="font-medium">Payment Link 1:</p>
                        <a
                            href={settings.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline break-all block"
                        >
                            {settings.paymentLink}
                        </a>
                    </div>
                )}

                {settings?.paymentLink2 && (
                    <div className="pt-2">
                        <p className="font-medium">Payment Link 2:</p>
                        <a
                            href={settings.paymentLink2}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline break-all block"
                        >
                            {settings.paymentLink2}
                        </a>
                    </div>
                )}
            </div>

            <ModalFooter>
                <Button variant="outline" onClick={onClose}>Close</Button>
                <Button onClick={handleExportPDF} loading={exporting}>
                    <Download className="w-4 h-4" />
                    Export PDF
                </Button>
            </ModalFooter>
        </Modal>
    );
}


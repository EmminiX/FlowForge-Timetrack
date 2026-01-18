import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Users, StickyNote } from 'lucide-react';
import type { ClientWithStats, CreateClientInput, UpdateClientInput } from '../../types';
import { clientService } from '../../services';
import { Button, Card, EmptyState, ConfirmDialog } from '../../components/ui';
import { ClientForm } from './ClientForm';

export function ClientsList() {
    const [clients, setClients] = useState<ClientWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

    // Modal states
    const [showForm, setShowForm] = useState(false);
    const [editingClient, setEditingClient] = useState<ClientWithStats | null>(null);
    const [deletingClient, setDeletingClient] = useState<ClientWithStats | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Load clients
    const loadClients = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await clientService.getAllWithStats();
            console.log('Loaded clients:', data);
            setClients(data);
        } catch (err) {
            console.error('Failed to load clients:', err);
            setError(err instanceof Error ? err.message : 'Failed to load clients');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClients();
    }, []);

    // Filter clients by search
    const filteredClients = useMemo(() => {
        if (!searchQuery.trim()) return clients;
        const query = searchQuery.toLowerCase();
        return clients.filter(
            (c) =>
                c.name.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query)
        );
    }, [clients, searchQuery]);

    // Handlers
    const handleCreate = async (data: CreateClientInput) => {
        setSubmitting(true);
        try {
            console.log('Creating client with data:', data);
            const result = await clientService.create(data);
            console.log('Created client:', result);
            await loadClients();
            setShowForm(false);
        } catch (err) {
            console.error('Failed to create client:', err);
            // Rethrow so the form can display the error
            throw err;
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async (data: UpdateClientInput) => {
        if (!editingClient) return;
        setSubmitting(true);
        try {
            console.log('Updating client:', editingClient.id, data);
            await clientService.update(editingClient.id, data);
            await loadClients();
            setEditingClient(null);
        } catch (err) {
            console.error('Failed to update client:', err);
            throw err;
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingClient) return;
        setSubmitting(true);
        try {
            await clientService.delete(deletingClient.id);
            await loadClients();
            setDeletingClient(null);
        } catch (err) {
            console.error('Failed to delete client:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete client');
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

    const formatHours = (hours: number) => {
        if (hours < 1) return `${Math.round(hours * 60)}m`;
        return `${hours.toFixed(1)}h`;
    };

    const toggleNotes = (clientId: string) => {
        const newExpanded = new Set(expandedNotes);
        if (newExpanded.has(clientId)) {
            newExpanded.delete(clientId);
        } else {
            newExpanded.add(clientId);
        }
        setExpandedNotes(newExpanded);
    };

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
                <h1 className="text-2xl font-bold text-foreground">Clients</h1>
                <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4" />
                    New Client
                </Button>
            </div>

            {/* Error message */}
            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive">
                    {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-2 underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Search */}
            {clients.length > 0 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
            )}

            {/* List */}
            {clients.length === 0 ? (
                <EmptyState
                    icon={<Users className="w-8 h-8" />}
                    title="No clients yet"
                    description="Add your first client to start tracking time and generating invoices."
                    action={
                        <Button onClick={() => setShowForm(true)}>
                            <Plus className="w-4 h-4" />
                            Add Client
                        </Button>
                    }
                />
            ) : filteredClients.length === 0 ? (
                <EmptyState
                    icon={<Search className="w-8 h-8" />}
                    title="No results"
                    description={`No clients found matching "${searchQuery}"`}
                />
            ) : (
                <div className="space-y-3">
                    {filteredClients.map((client) => (
                        <Card key={client.id} className="flex flex-col p-4 transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-foreground truncate">{client.name}</h3>
                                    {client.email && (
                                        <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-6 ml-4">
                                    {/* Stats */}
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-foreground">
                                            {formatHours(client.totalHours)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">tracked</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-foreground">
                                            {formatCurrency(client.totalBillable)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">billable</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-foreground">
                                            {client.projectCount}
                                        </p>
                                        <p className="text-xs text-muted-foreground">projects</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1">
                                        {client.notes && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleNotes(client.id)}
                                                className={expandedNotes.has(client.id) ? 'bg-muted text-primary' : 'text-muted-foreground'}
                                                aria-label="View notes"
                                                title="View notes"
                                            >
                                                <StickyNote className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingClient(client)}
                                            aria-label="Edit client"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeletingClient(client)}
                                            aria-label="Delete client"
                                        >
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Notes Section */}
                            {expandedNotes.has(client.id) && client.notes && (
                                <div className="mt-4 pt-3 border-t border-border animate-in slide-in-from-top-2 fade-in duration-200">
                                    <div className="flex gap-2 text-sm text-muted-foreground">
                                        <StickyNote className="w-4 h-4 shrink-0 mt-0.5" />
                                        <p className="whitespace-pre-wrap">{client.notes}</p>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Form */}
            <ClientForm
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSubmit={handleCreate}
                loading={submitting}
            />

            {/* Edit Form */}
            {editingClient && (
                <ClientForm
                    isOpen={true}
                    onClose={() => setEditingClient(null)}
                    onSubmit={handleUpdate}
                    initialData={editingClient}
                    loading={submitting}
                />
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deletingClient}
                onClose={() => setDeletingClient(null)}
                onConfirm={handleDelete}
                title="Delete Client"
                message={`Are you sure you want to delete "${deletingClient?.name}"? This will also delete all associated projects and time entries.`}
                confirmLabel="Delete"
                variant="danger"
                loading={submitting}
            />
        </div>
    );
}

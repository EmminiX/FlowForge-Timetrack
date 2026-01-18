import { useState, useEffect, useMemo } from 'react';
import { Search, Trash2, Clock, Calendar, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';
import type { TimeEntryWithProject } from '../../types';
import { formatDurationShort, calculateDuration } from '../../types';
import { timeEntryService, projectService, clientService } from '../../services';
import type { Project, Client } from '../../types';
import { Button, Card, EmptyState, ConfirmDialog, Select, Badge } from '../../components/ui';

export function TimeEntriesList() {
    const [entries, setEntries] = useState<TimeEntryWithProject[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [projectFilter, setProjectFilter] = useState<string>('');
    const [clientFilter, setClientFilter] = useState<string>('');
    const [billableFilter, setBillableFilter] = useState<string>('');

    // Selection for bulk actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deletingEntries, setDeletingEntries] = useState<TimeEntryWithProject[] | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Billed section visibility
    const [showBilledSection, setShowBilledSection] = useState(true);

    const loadData = async () => {
        try {
            setLoading(true);

            const [entriesData, projectsData, clientsData] = await Promise.all([
                timeEntryService.getAll(),
                projectService.getAll(),
                clientService.getAll(),
            ]);

            setEntries(entriesData);
            setProjects(projectsData);
            setClients(clientsData);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Apply filters
    const filteredEntries = useMemo(() => {
        let result = entries;

        if (projectFilter) {
            result = result.filter((e) => e.projectId === projectFilter);
        }

        if (clientFilter) {
            result = result.filter((e) => e.clientId === clientFilter);
        }

        if (billableFilter === 'billable') {
            result = result.filter((e) => e.isBillable);
        } else if (billableFilter === 'unbillable') {
            result = result.filter((e) => !e.isBillable);
        }

        return result;
    }, [entries, projectFilter, clientFilter, billableFilter]);

    // Split into unbilled and billed
    const unbilledEntries = useMemo(() =>
        filteredEntries.filter((e) => !e.isBilled),
        [filteredEntries]);

    const billedEntries = useMemo(() =>
        filteredEntries.filter((e) => e.isBilled),
        [filteredEntries]);

    const projectOptions = [
        { value: '', label: 'All Projects' },
        ...projects.map((p) => ({ value: p.id, label: p.name })),
    ];

    const clientOptions = [
        { value: '', label: 'All Clients' },
        ...clients.map((c) => ({ value: c.id, label: c.name })),
    ];

    const billableOptions = [
        { value: '', label: 'All Entries' },
        { value: 'billable', label: 'Billable' },
        { value: 'unbillable', label: 'Non-billable' },
    ];

    const handleSelectAll = (entriesGroup: TimeEntryWithProject[]) => {
        const allIds = entriesGroup.map((e) => e.id);
        const allSelected = allIds.every((id) => selectedIds.has(id));

        if (allSelected) {
            // Deselect all in this group
            const newSelected = new Set(selectedIds);
            allIds.forEach((id) => newSelected.delete(id));
            setSelectedIds(newSelected);
        } else {
            // Select all in this group
            const newSelected = new Set(selectedIds);
            allIds.forEach((id) => newSelected.add(id));
            setSelectedIds(newSelected);
        }
    };

    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleDeleteSelected = () => {
        const toDelete = filteredEntries.filter((e) => selectedIds.has(e.id));
        setDeletingEntries(toDelete);
    };

    const handleConfirmDelete = async () => {
        if (!deletingEntries) return;

        setSubmitting(true);
        try {
            await timeEntryService.deleteMany(deletingEntries.map((e) => e.id));
            setSelectedIds(new Set());
            await loadData();
            setDeletingEntries(null);
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkAsBilled = async () => {
        setSubmitting(true);
        try {
            await timeEntryService.markAsBilled(Array.from(selectedIds));
            setSelectedIds(new Set());
            await loadData();
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkAsUnbilled = async () => {
        setSubmitting(true);
        try {
            await timeEntryService.markAsUnbilled(Array.from(selectedIds));
            setSelectedIds(new Set());
            await loadData();
        } finally {
            setSubmitting(false);
        }
    };

    // Check if any selected entries are billed (to show Unbill button)
    const hasSelectedBilledEntries = useMemo(() => {
        return filteredEntries.some((e) => selectedIds.has(e.id) && e.isBilled);
    }, [filteredEntries, selectedIds]);

    // Check if any selected entries are unbilled (to show Mark as Billed button)
    const hasSelectedUnbilledEntries = useMemo(() => {
        return filteredEntries.some((e) => selectedIds.has(e.id) && !e.isBilled);
    }, [filteredEntries, selectedIds]);

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Calculate total for selected
    const selectedTotal = useMemo(() => {
        const selected = filteredEntries.filter((e) => selectedIds.has(e.id));
        return selected.reduce((sum, e) => sum + calculateDuration(e), 0);
    }, [filteredEntries, selectedIds]);

    // Render a time entry card
    const renderEntry = (entry: TimeEntryWithProject) => (
        <Card
            key={entry.id}
            className="flex items-center gap-4 p-4"
            onClick={() => handleSelect(entry.id)}
            hover
        >
            <input
                type="checkbox"
                checked={selectedIds.has(entry.id)}
                onChange={() => handleSelect(entry.id)}
                onClick={(e) => e.stopPropagation()}
                className="rounded border-border"
            />

            {/* Project color */}
            <div
                className="w-2 h-10 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.projectColor }}
            />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">
                        {entry.projectName}
                    </span>
                    {entry.isBilled ? (
                        <Badge variant="success" size="sm" className="gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Billed
                        </Badge>
                    ) : entry.isBillable ? (
                        <Badge variant="info" size="sm">Billable</Badge>
                    ) : null}
                </div>
                {entry.clientName && (
                    <p className="text-sm text-muted-foreground truncate">
                        {entry.clientName}
                    </p>
                )}
                {entry.notes && (
                    <p className="text-sm text-muted-foreground truncate mt-1">
                        {entry.notes}
                    </p>
                )}
            </div>

            <div className="text-right text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatDate(entry.startTime)}
                </div>
                <div className="text-xs text-muted-foreground">
                    {formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : 'Running'}
                </div>
            </div>

            <div className="text-right min-w-[60px]">
                <p className="font-mono font-medium text-foreground">
                    {formatDurationShort(calculateDuration(entry))}
                </p>
            </div>
        </Card>
    );

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
                <h1 className="text-2xl font-bold text-foreground">Time Entries</h1>
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            {selectedIds.size} selected ({formatDurationShort(selectedTotal)})
                        </span>
                        {hasSelectedUnbilledEntries && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleMarkAsBilled}
                                loading={submitting}
                            >
                                <CheckCircle className="w-4 h-4" />
                                Mark as Billed
                            </Button>
                        )}
                        {hasSelectedBilledEntries && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleMarkAsUnbilled}
                                loading={submitting}
                            >
                                <XCircle className="w-4 h-4" />
                                Unbill
                            </Button>
                        )}
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteSelected}
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </Button>
                    </div>
                )}
            </div>

            {/* Filters */}
            {entries.length > 0 && (
                <div className="flex gap-4">
                    <div className="w-48">
                        <Select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            options={projectOptions}
                        />
                    </div>
                    <div className="w-48">
                        <Select
                            value={clientFilter}
                            onChange={(e) => setClientFilter(e.target.value)}
                            options={clientOptions}
                        />
                    </div>
                    <div className="w-40">
                        <Select
                            value={billableFilter}
                            onChange={(e) => setBillableFilter(e.target.value)}
                            options={billableOptions}
                        />
                    </div>
                </div>
            )}

            {/* List */}
            {entries.length === 0 ? (
                <EmptyState
                    icon={<Clock className="w-8 h-8" />}
                    title="No time entries yet"
                    description="Start tracking time on a project to see entries here."
                />
            ) : filteredEntries.length === 0 ? (
                <EmptyState
                    icon={<Search className="w-8 h-8" />}
                    title="No matching entries"
                    description="Try adjusting your filters."
                />
            ) : (
                <div className="space-y-8">
                    {/* Unbilled Section */}
                    {unbilledEntries.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 px-4 py-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={unbilledEntries.every((e) => selectedIds.has(e.id)) && unbilledEntries.length > 0}
                                    onChange={() => handleSelectAll(unbilledEntries)}
                                    className="rounded border-border"
                                />
                                <span className="font-semibold text-foreground">
                                    Unbilled ({unbilledEntries.length})
                                </span>
                                <span className="text-muted-foreground">
                                    {formatDurationShort(unbilledEntries.reduce((sum, e) => sum + calculateDuration(e), 0))}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {unbilledEntries.map(renderEntry)}
                            </div>
                        </div>
                    )}

                    {/* Billed Section */}
                    {billedEntries.length > 0 && (
                        <div className="space-y-2">
                            <button
                                onClick={() => setShowBilledSection(!showBilledSection)}
                                className="flex items-center gap-3 px-4 py-2 text-sm w-full hover:bg-muted/50 rounded-lg transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={billedEntries.every((e) => selectedIds.has(e.id)) && billedEntries.length > 0}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        handleSelectAll(billedEntries);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="rounded border-border"
                                />
                                <span className="font-semibold text-foreground flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Billed ({billedEntries.length})
                                </span>
                                <span className="text-muted-foreground">
                                    {formatDurationShort(billedEntries.reduce((sum, e) => sum + calculateDuration(e), 0))}
                                </span>
                                <span className="ml-auto">
                                    {showBilledSection ? (
                                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </span>
                            </button>

                            {showBilledSection && (
                                <div className="space-y-2">
                                    {billedEntries.map(renderEntry)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deletingEntries}
                onClose={() => setDeletingEntries(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Time Entries"
                message={`Are you sure you want to delete ${deletingEntries?.length || 0} time ${deletingEntries?.length === 1 ? 'entry' : 'entries'}? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                loading={submitting}
            />
        </div>
    );
}


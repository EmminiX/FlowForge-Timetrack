import { useState, useEffect, useMemo } from 'react';
import { Search, Trash2, Clock, Calendar, CheckCircle, XCircle } from 'lucide-react';
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
    const [statusFilter, setStatusFilter] = useState<string>('');

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

        if (statusFilter === 'billed') {
            result = result.filter((e) => e.isBilled);
        } else if (statusFilter === 'unbilled') {
            // "Not Billed" means isBilled is false (it might be billable or not, but it hasn't been billed yet)
            result = result.filter((e) => !e.isBilled);
        }

        return result;
    }, [entries, projectFilter, clientFilter, statusFilter]);

    // Split into unbilled and billed
    const unbilledEntries = useMemo(() =>
        filteredEntries.filter((e) => !e.isBilled),
        [filteredEntries]);

    const billedEntries = useMemo(() =>
        filteredEntries.filter((e) => e.isBilled),
        [filteredEntries]);

    // Grouping entries
    const groupEntries = (entriesToGroup: TimeEntryWithProject[]) => {
        const groups: Record<string, {
            clientName: string;
            projects: Record<string, {
                projectName: string;
                projectColor: string;
                entries: TimeEntryWithProject[];
            }>
        }> = {};

        entriesToGroup.forEach(entry => {
            const clientId = entry.clientId || 'no-client';
            const clientName = entry.clientName || 'No Client';
            const projectId = entry.projectId;
            const projectName = entry.projectName;
            const projectColor = entry.projectColor;

            if (!groups[clientId]) {
                groups[clientId] = {
                    clientName,
                    projects: {}
                };
            }

            if (!groups[clientId].projects[projectId]) {
                groups[clientId].projects[projectId] = {
                    projectName,
                    projectColor,
                    entries: []
                };
            }

            groups[clientId].projects[projectId].entries.push(entry);
        });

        return groups;
    };

    const unbilledGroups = useMemo(() => groupEntries(unbilledEntries), [unbilledEntries]);
    const billedGroups = useMemo(() => groupEntries(billedEntries), [billedEntries]);

    const projectOptions = [
        { value: '', label: 'All Projects' },
        ...projects.map((p) => ({ value: p.id, label: p.name })),
    ];

    const clientOptions = [
        { value: '', label: 'All Clients' },
        ...clients.map((c) => ({ value: c.id, label: c.name })),
    ];

    const statusOptions = [
        { value: '', label: 'All Entries' },
        { value: 'billed', label: 'Billed' },
        { value: 'unbilled', label: 'Not Billed' },
    ];

    // handleSelectAll is available if needed for future use
    // Currently using handleSelectMultiple for project-level selection

    const handleSelect = (id: string, selected: boolean) => {
        const newSelected = new Set(selectedIds);
        if (selected) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectMultiple = (ids: string[], selected: boolean) => {
        const newSelected = new Set(selectedIds);
        if (selected) {
            ids.forEach(id => newSelected.add(id));
        } else {
            ids.forEach(id => newSelected.delete(id));
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

    // Calculate total for selected
    const selectedTotal = useMemo(() => {
        const selected = filteredEntries.filter((e) => selectedIds.has(e.id));
        return selected.reduce((sum, e) => sum + calculateDuration(e), 0);
    }, [filteredEntries, selectedIds]);

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
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={statusOptions}
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
                    {Object.keys(unbilledGroups).length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-border">
                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                <h2 className="font-semibold">Unbilled</h2>
                            </div>
                            {Object.entries(unbilledGroups).map(([clientId, group]) => (
                                <ClientGroup
                                    key={clientId}
                                    clientName={group.clientName}
                                    projects={group.projects}
                                    onSelectIds={handleSelect}
                                    onSelectMultiple={handleSelectMultiple}
                                    selectedIds={selectedIds}
                                />
                            ))}
                        </div>
                    )}

                    {/* Billed Section */}
                    {Object.keys(billedGroups).length > 0 && (
                        <div className="space-y-4 pt-8">
                            <button
                                onClick={() => setShowBilledSection(!showBilledSection)}
                                className="flex items-center gap-2 pb-2 border-b border-border w-full text-left hover:bg-muted/50 transition-colors rounded px-1"
                            >
                                <span className={`transform transition-transform ${showBilledSection ? 'rotate-90' : ''}`}>▶</span>
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <h2 className="font-semibold">Billed</h2>
                            </button>

                            {showBilledSection && Object.entries(billedGroups).map(([clientId, group]) => (
                                <ClientGroup
                                    key={clientId}
                                    clientName={group.clientName}
                                    projects={group.projects}
                                    onSelectIds={handleSelect}
                                    onSelectMultiple={handleSelectMultiple}
                                    selectedIds={selectedIds}
                                />
                            ))}
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

// Sub-components

const ClientGroup = ({
    clientName,
    projects,
    onSelectIds,
    onSelectMultiple,
    selectedIds
}: {
    clientName: string,
    projects: any,
    onSelectIds: (id: string, selected: boolean) => void,
    onSelectMultiple: (ids: string[], selected: boolean) => void,
    selectedIds: Set<string>
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="border border-border rounded-lg overflow-hidden mb-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 bg-secondary/50 hover:bg-secondary transition-colors"
            >
                <div className="flex items-center gap-2 font-medium">
                    <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    {clientName}
                </div>
                <div className="text-muted-foreground text-sm">
                    {Object.keys(projects).length} Projects
                </div>
            </button>

            {isExpanded && (
                <div className="p-2 space-y-2">
                    {Object.values(projects).map((project: any) => (
                        <ProjectGroup
                            key={project.projectName}
                            project={project}
                            onSelectIds={onSelectIds}
                            onSelectMultiple={onSelectMultiple}
                            selectedIds={selectedIds}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const ProjectGroup = ({
    project,
    onSelectIds,
    onSelectMultiple,
    selectedIds
}: {
    project: any,
    onSelectIds: (id: string, selected: boolean) => void,
    onSelectMultiple: (ids: string[], selected: boolean) => void,
    selectedIds: Set<string>
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="ml-2 border-l-2 border-border pl-2">
            <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors">
                <input
                    type="checkbox"
                    checked={project.entries.every((e: TimeEntryWithProject) => selectedIds.has(e.id))}
                    onChange={(e) => {
                        e.stopPropagation();
                        onSelectMultiple(project.entries.map((e: any) => e.id), e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-border mr-2"
                />
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex-1 flex items-center justify-between"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.projectColor }} />
                        <span className="font-medium">{project.projectName}</span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                        {project.entries.length} Entries
                    </div>
                </button>
            </div>

            {isExpanded && (
                <div className="mt-2 space-y-2">
                    {project.entries.map((entry: TimeEntryWithProject) => (
                        <div key={entry.id} className="ml-4">
                            <TimeEntryCard
                                entry={entry}
                                selected={selectedIds.has(entry.id)}
                                onSelect={() => onSelectIds(entry.id, !selectedIds.has(entry.id))}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const TimeEntryCard = ({
    entry,
    selected,
    onSelect
}: {
    entry: TimeEntryWithProject,
    selected: boolean,
    onSelect: () => void
}) => {
    // Helper formats
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

    return (
        <Card
            className="flex items-center gap-4 p-4"
            onClick={onSelect}
            hover
        >
            <input
                type="checkbox"
                checked={selected}
                onChange={onSelect}
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
};

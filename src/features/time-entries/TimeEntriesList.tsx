import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Trash2,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Pencil,
  Download,
  Plus,
} from 'lucide-react';
import type { TimeEntryWithProject, TimeEntry, CreateTimeEntryInput } from '../../types';
import { formatDurationShort, calculateDuration } from '../../types';
import { timeEntryService, projectService, clientService } from '../../services';
import type { Project, Client } from '../../types';
import { timeEntryLogger } from '../../lib/logger';
import { generateCSV, downloadCSV } from '../../lib/exportUtils';
import { ListSkeleton } from '../../components/ui';
import { useUndoableAction } from '../../hooks/useUndoableAction';
import {
  Button,
  Card,
  EmptyState,
  ConfirmDialog,
  Select,
  Badge,
  Modal,
  ModalFooter,
  Input,
  Textarea,
} from '../../components/ui';

export function TimeEntriesList() {
  const location = useLocation();
  const navigate = useNavigate();
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

  const { execute: executeUndoable } = useUndoableAction();

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState<TimeEntryWithProject | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

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
      timeEntryLogger.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Use timeout to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('quick-add') !== '1') return;

    setShowQuickAdd(true);
    params.delete('quick-add');
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

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
  const unbilledEntries = useMemo(
    () => filteredEntries.filter((e) => !e.isBilled),
    [filteredEntries],
  );

  const billedEntries = useMemo(() => filteredEntries.filter((e) => e.isBilled), [filteredEntries]);

  // Grouping entries
  const groupEntries = (entriesToGroup: TimeEntryWithProject[]) => {
    const groups: Record<
      string,
      {
        clientName: string;
        projects: Record<
          string,
          {
            projectName: string;
            projectColor: string;
            entries: TimeEntryWithProject[];
          }
        >;
      }
    > = {};

    entriesToGroup.forEach((entry) => {
      const clientId = entry.clientId || 'no-client';
      const clientName = entry.clientName || 'No Client';
      const projectId = entry.projectId;
      const projectName = entry.projectName;
      const projectColor = entry.projectColor;

      if (!groups[clientId]) {
        groups[clientId] = {
          clientName,
          projects: {},
        };
      }

      if (!groups[clientId].projects[projectId]) {
        groups[clientId].projects[projectId] = {
          projectName,
          projectColor,
          entries: [],
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
      ids.forEach((id) => newSelected.add(id));
    } else {
      ids.forEach((id) => newSelected.delete(id));
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = () => {
    const toDelete = filteredEntries.filter((e) => selectedIds.has(e.id));
    setDeletingEntries(toDelete);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEntries) return;

    const entriesToDelete = deletingEntries;
    setDeletingEntries(null);
    setSelectedIds(new Set());

    if (entriesToDelete.length === 1) {
      const entry = entriesToDelete[0];
      // Optimistic remove
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      executeUndoable({
        message: `Deleted time entry for "${entry.projectName}"`,
        action: async () => {
          await timeEntryService.bulkDelete([entry.id]);
        },
        onUndo: () => {
          loadData();
        },
      });
    } else {
      setSubmitting(true);
      try {
        await timeEntryService.bulkDelete(entriesToDelete.map((e) => e.id));
        await loadData();
      } catch (error) {
        timeEntryLogger.error('Failed to delete entries', error);
      } finally {
        setSubmitting(false);
      }
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

  const handleExportCSV = async () => {
    try {
      const headers = [
        'Date',
        'Project',
        'Client',
        'Start',
        'End',
        'Duration',
        'Billable',
        'Billed',
        'Notes',
      ];
      const rows = filteredEntries.map((entry) => [
        new Date(entry.startTime).toLocaleDateString(),
        entry.projectName || '',
        entry.clientName || '',
        new Date(entry.startTime).toLocaleTimeString(),
        entry.endTime ? new Date(entry.endTime).toLocaleTimeString() : '',
        entry.endTime ? formatDurationShort(calculateDuration(entry)) : '',
        entry.isBillable ? 'Yes' : 'No',
        entry.isBilled ? 'Yes' : 'No',
        entry.notes || '',
      ]);
      const csv = generateCSV(headers, rows);
      await downloadCSV(`time-entries-${new Date().toISOString().split('T')[0]}.csv`, csv);
    } catch (error) {
      timeEntryLogger.error('Failed to export CSV', error);
    }
  };

  const handleQuickAdd = async (input: CreateTimeEntryInput) => {
    setSubmitting(true);
    try {
      await timeEntryService.create(input);
      await loadData();
      setShowQuickAdd(false);
    } catch (error) {
      timeEntryLogger.error('Failed to quick-add time entry', error);
      throw error;
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
    return <ListSkeleton />;
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-foreground'>Time Entries</h1>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleExportCSV}
            disabled={filteredEntries.length === 0}
          >
            <Download className='w-4 h-4' />
            Export CSV
          </Button>
          <Button
            variant='secondary'
            size='sm'
            onClick={() => setShowQuickAdd(true)}
            disabled={projects.length === 0}
          >
            <Plus className='w-4 h-4' />
            Quick Add
          </Button>
          {selectedIds.size > 0 && (
            <div className='flex items-center gap-2'>
              <span className='text-sm text-muted-foreground'>
                {selectedIds.size} selected ({formatDurationShort(selectedTotal)})
              </span>
              {hasSelectedUnbilledEntries && (
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={handleMarkAsBilled}
                  loading={submitting}
                >
                  <CheckCircle className='w-4 h-4' />
                  Mark as Billed
                </Button>
              )}
              {hasSelectedBilledEntries && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleMarkAsUnbilled}
                  loading={submitting}
                >
                  <XCircle className='w-4 h-4' />
                  Unbill
                </Button>
              )}
              <Button variant='destructive' size='sm' onClick={handleDeleteSelected}>
                <Trash2 className='w-4 h-4' />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      {entries.length > 0 && (
        <div className='flex gap-4'>
          <div className='w-48'>
            <Select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              options={projectOptions}
              aria-label='Filter time entries by project'
            />
          </div>
          <div className='w-48'>
            <Select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              options={clientOptions}
              aria-label='Filter time entries by client'
            />
          </div>
          <div className='w-40'>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              aria-label='Filter time entries by billing status'
            />
          </div>
        </div>
      )}

      {/* List */}
      {entries.length === 0 ? (
        <EmptyState
          icon={<Clock className='w-8 h-8' />}
          variant='guided'
          title='No time entries yet'
          description='Start tracking time on a project to see entries here.'
        />
      ) : filteredEntries.length === 0 ? (
        <EmptyState
          icon={<Search className='w-8 h-8' />}
          variant='minimal'
          title='No matching entries'
          description='Try adjusting your filters.'
        />
      ) : (
        <div className='space-y-8'>
          {/* Unbilled Section */}
          {Object.keys(unbilledGroups).length > 0 && (
            <div className='space-y-4'>
              <div className='flex items-center gap-2 pb-2 border-b border-border'>
                <div className='w-2 h-2 rounded-full bg-accent' />
                <h2 className='font-semibold'>Unbilled</h2>
              </div>
              {Object.entries(unbilledGroups).map(([clientId, group]) => (
                <ClientGroup
                  key={clientId}
                  clientName={group.clientName}
                  projects={group.projects}
                  onSelectIds={handleSelect}
                  onSelectMultiple={handleSelectMultiple}
                  selectedIds={selectedIds}
                  onEdit={setEditingEntry}
                />
              ))}
            </div>
          )}

          {/* Billed Section */}
          {Object.keys(billedGroups).length > 0 && (
            <div className='space-y-4 pt-8'>
              <button
                onClick={() => setShowBilledSection(!showBilledSection)}
                className='flex min-h-11 w-full items-center gap-2 rounded border-b border-border px-1 pb-2 text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring'
                aria-expanded={showBilledSection}
              >
                <span
                  className={`transform transition-transform ${showBilledSection ? 'rotate-90' : ''}`}
                >
                  ▶
                </span>
                <div className='w-2 h-2 rounded-full bg-primary' />
                <h2 className='font-semibold'>Billed</h2>
              </button>

              {showBilledSection &&
                Object.entries(billedGroups).map(([clientId, group]) => (
                  <ClientGroup
                    key={clientId}
                    clientName={group.clientName}
                    projects={group.projects}
                    onSelectIds={handleSelect}
                    onSelectMultiple={handleSelectMultiple}
                    selectedIds={selectedIds}
                    onEdit={setEditingEntry}
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
        title='Delete Time Entries'
        message={`Are you sure you want to delete ${deletingEntries?.length || 0} time ${deletingEntries?.length === 1 ? 'entry' : 'entries'}? This action cannot be undone.`}
        confirmLabel='Delete'
        variant='danger'
        loading={submitting}
      />

      {/* Edit Time Entry Modal */}
      {editingEntry && (
        <EditTimeEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={async (updates) => {
            await timeEntryService.update(editingEntry.id, updates);
            await loadData();
            setEditingEntry(null);
          }}
        />
      )}

      {showQuickAdd && (
        <QuickAddTimeEntryModal
          projects={projects}
          onClose={() => setShowQuickAdd(false)}
          onSave={handleQuickAdd}
          loading={submitting}
        />
      )}
    </div>
  );
}

// Sub-components

const ClientGroup = ({
  clientName,
  projects,
  onSelectIds,
  onSelectMultiple,
  selectedIds,
  onEdit,
}: {
  clientName: string;
  projects: Record<
    string,
    { projectName: string; projectColor: string; entries: TimeEntryWithProject[] }
  >;
  onSelectIds: (id: string, selected: boolean) => void;
  onSelectMultiple: (ids: string[], selected: boolean) => void;
  selectedIds: Set<string>;
  onEdit: (entry: TimeEntryWithProject) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className='border border-border rounded-lg overflow-hidden mb-4'>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className='flex min-h-11 w-full items-center justify-between bg-secondary/50 p-3 transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring'
        aria-expanded={isExpanded}
      >
        <div className='flex items-center gap-2 font-medium'>
          <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            ▶
          </span>
          {clientName}
        </div>
        <div className='text-muted-foreground text-sm'>{Object.keys(projects).length} Projects</div>
      </button>

      {isExpanded && (
        <div className='p-2 space-y-2'>
          {Object.values(projects).map((project) => (
            <ProjectGroup
              key={project.projectName}
              project={project}
              onSelectIds={onSelectIds}
              onSelectMultiple={onSelectMultiple}
              selectedIds={selectedIds}
              onEdit={onEdit}
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
  selectedIds,
  onEdit,
}: {
  project: { projectName: string; projectColor: string; entries: TimeEntryWithProject[] };
  onSelectIds: (id: string, selected: boolean) => void;
  onSelectMultiple: (ids: string[], selected: boolean) => void;
  selectedIds: Set<string>;
  onEdit: (entry: TimeEntryWithProject) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className='ml-2 border-l-2 border-border pl-2'>
      <div className='flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors'>
        <input
          type='checkbox'
          checked={project.entries.every((e: TimeEntryWithProject) => selectedIds.has(e.id))}
          aria-label={`Select all entries for ${project.projectName}`}
          onChange={(e) => {
            e.stopPropagation();
            onSelectMultiple(
              project.entries.map((e) => e.id),
              e.target.checked,
            );
          }}
          onClick={(e) => e.stopPropagation()}
          className='rounded border-border mr-2'
        />
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className='flex min-h-11 flex-1 items-center justify-between rounded-md px-2 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring'
          aria-expanded={isExpanded}
        >
          <div className='flex items-center gap-2'>
            <div
              className='w-2 h-2 rounded-full'
              style={{ backgroundColor: project.projectColor }}
            />
            <span className='font-medium'>{project.projectName}</span>
          </div>
          <div className='text-muted-foreground text-xs'>{project.entries.length} Entries</div>
        </button>
      </div>

      {isExpanded && (
        <div className='mt-2 space-y-2'>
          {project.entries.map((entry: TimeEntryWithProject) => (
            <div key={entry.id} className='ml-4'>
              <TimeEntryCard
                entry={entry}
                selected={selectedIds.has(entry.id)}
                onSelect={() => onSelectIds(entry.id, !selectedIds.has(entry.id))}
                onEdit={() => onEdit(entry)}
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
  onSelect,
  onEdit,
}: {
  entry: TimeEntryWithProject;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
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
    <Card className='flex items-center gap-4 p-4' onClick={onSelect} hover>
      <input
        type='checkbox'
        checked={selected}
        aria-label={`Select entry for ${entry.projectName}`}
        onChange={onSelect}
        onClick={(e) => e.stopPropagation()}
        className='rounded border-border'
      />

      {/* Project color */}
      <div
        className='w-2 h-10 rounded-full flex-shrink-0'
        style={{ backgroundColor: entry.projectColor }}
      />

      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2'>
          <span className='font-medium text-foreground truncate'>{entry.projectName}</span>
          {entry.isBilled ? (
            <Badge variant='success' size='sm' className='gap-1'>
              <CheckCircle className='w-3 h-3' />
              Billed
            </Badge>
          ) : entry.isBillable ? (
            <Badge variant='info' size='sm'>
              Billable
            </Badge>
          ) : null}
        </div>
        {entry.clientName && (
          <p className='text-sm text-muted-foreground truncate'>{entry.clientName}</p>
        )}
        {entry.notes && (
          <p className='text-sm text-muted-foreground truncate mt-1'>{entry.notes}</p>
        )}
      </div>

      <div className='text-right text-sm'>
        <div className='flex items-center gap-1 text-muted-foreground'>
          <Calendar className='w-3 h-3' />
          {formatDate(entry.startTime)}
        </div>
        <div className='text-xs text-muted-foreground'>
          {formatTime(entry.startTime)} - {entry.endTime ? formatTime(entry.endTime) : 'Running'}
        </div>
      </div>

      <div className='text-right min-w-[60px]'>
        <p className='font-mono font-medium text-foreground'>
          {formatDurationShort(calculateDuration(entry))}
        </p>
      </div>

      {/* Edit button */}
      <Button
        variant='ghost'
        size='sm'
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        aria-label='Edit entry'
      >
        <Pencil className='w-4 h-4' />
      </Button>
    </Card>
  );
};

const toLocalDatetime = (iso: string) => {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const QuickAddTimeEntryModal = ({
  projects,
  onClose,
  onSave,
  loading,
}: {
  projects: Project[];
  onClose: () => void;
  onSave: (input: CreateTimeEntryInput) => Promise<void>;
  loading: boolean;
}) => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [startTime, setStartTime] = useState(toLocalDatetime(oneHourAgo.toISOString()));
  const [endTime, setEndTime] = useState(toLocalDatetime(now.toISOString()));
  const [notes, setNotes] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const durationSeconds = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return Math.max(0, (end - start) / 1000);
  }, [startTime, endTime]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!projectId) {
      setError('Choose a project first.');
      return;
    }

    if (!startTime || !endTime || new Date(endTime) <= new Date(startTime)) {
      setError('End time must be after start time.');
      return;
    }

    try {
      await onSave({
        projectId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        pauseDuration: 0,
        notes,
        isBillable,
        isBilled: false,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save time entry.');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title='Quick-Add Time' size='lg'>
      <form onSubmit={handleSubmit} className='space-y-4'>
        {error && (
          <div className='rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive'>
            {error}
          </div>
        )}

        <Select
          label='Project *'
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
          placeholder={projects.length === 0 ? 'Create a project first' : 'Choose a project'}
          disabled={projects.length === 0}
        />

        <div className='grid gap-4 sm:grid-cols-2'>
          <Input
            label='Start Time'
            type='datetime-local'
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            label='End Time'
            type='datetime-local'
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        {durationSeconds > 0 && (
          <div className='rounded-md bg-muted p-3 text-center'>
            <span className='text-sm text-muted-foreground'>Duration: </span>
            <span className='font-mono font-medium'>{formatDurationShort(durationSeconds)}</span>
          </div>
        )}

        <Textarea
          label='Notes'
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='What did you work on?'
          rows={2}
        />

        <div className='flex items-center gap-2'>
          <input
            type='checkbox'
            id='quick-add-billable'
            checked={isBillable}
            onChange={(e) => setIsBillable(e.target.checked)}
            className='rounded border-border'
          />
          <label htmlFor='quick-add-billable' className='text-sm'>
            This time is billable
          </label>
        </div>

        <ModalFooter>
          <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type='submit' loading={loading} disabled={projects.length === 0}>
            Save Time
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

// Edit Time Entry Modal
const EditTimeEntryModal = ({
  entry,
  onClose,
  onSave,
}: {
  entry: TimeEntryWithProject;
  onClose: () => void;
  onSave: (updates: Partial<TimeEntry>) => Promise<void>;
}) => {
  const [saving, setSaving] = useState(false);

  const [startTime, setStartTime] = useState(toLocalDatetime(entry.startTime));
  const [endTime, setEndTime] = useState(entry.endTime ? toLocalDatetime(entry.endTime) : '');
  const [notes, setNotes] = useState(entry.notes || '');
  const [isBillable, setIsBillable] = useState(entry.isBillable);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : null,
        notes,
        isBillable,
      });
    } catch (error) {
      timeEntryLogger.error('Failed to save entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Calculate duration for display
  const durationSeconds = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return Math.max(0, (end - start) / 1000 - (entry.pauseDuration || 0));
  }, [startTime, endTime, entry.pauseDuration]);

  return (
    <Modal isOpen={true} onClose={onClose} title='Edit Time Entry' size='lg'>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div className='p-3 bg-secondary rounded-lg'>
          <div className='flex items-center gap-2 text-sm'>
            <div className='w-3 h-3 rounded-full' style={{ backgroundColor: entry.projectColor }} />
            <span className='font-medium'>{entry.projectName}</span>
            {entry.clientName && (
              <span className='text-muted-foreground'>• {entry.clientName}</span>
            )}
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <Input
            label='Start Time'
            type='datetime-local'
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <Input
            label='End Time'
            type='datetime-local'
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        {durationSeconds > 0 && (
          <div className='text-center p-3 bg-muted rounded-lg'>
            <span className='text-sm text-muted-foreground'>Duration: </span>
            <span className='font-mono font-medium'>{formatDurationShort(durationSeconds)}</span>
            {entry.pauseDuration > 0 && (
              <span className='text-xs text-muted-foreground ml-2'>
                (excl. {Math.round(entry.pauseDuration / 60)}m pause)
              </span>
            )}
          </div>
        )}

        <Textarea
          label='Notes'
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='Add notes about this time entry...'
          rows={2}
        />

        <div className='flex items-center gap-2'>
          <input
            type='checkbox'
            id='edit-billable'
            checked={isBillable}
            onChange={(e) => setIsBillable(e.target.checked)}
            className='rounded border-border'
          />
          <label htmlFor='edit-billable' className='text-sm'>
            This time is billable
          </label>
        </div>

        <ModalFooter>
          <Button type='button' variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button type='submit' loading={saving}>
            Save Changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

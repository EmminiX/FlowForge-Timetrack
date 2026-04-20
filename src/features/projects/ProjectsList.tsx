import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Briefcase } from 'lucide-react';
import type {
  ProjectWithStats,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectStatus,
} from '../../types';
import { PROJECT_STATUS_OPTIONS } from '../../types';
import { projectService } from '../../services';
import { Button, EmptyState, ConfirmDialog, Select, ListSkeleton } from '../../components/ui';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { ProjectForm } from './ProjectForm';
import { ClientGroup } from './ClientGroup';
import { projectLogger } from '../../lib/logger';
import { useUndoableAction } from '../../hooks/useUndoableAction';

function ProjectsListContent() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  // ... rest of component same as before ...
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithStats | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectWithStats | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { execute: executeUndoable } = useUndoableAction();

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getAllWithStats();
      projectLogger.debug('Loaded projects:', data);
      setProjects(data);
    } catch (err) {
      projectLogger.error('Failed to load projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Filter projects
  const filteredProjects = useMemo(() => {
    let result = projects;

    if (statusFilter) {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(query) || p.clientName?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [projects, searchQuery, statusFilter]);

  // Group projects by client
  const groupedProjects = useMemo(() => {
    const groups: Record<
      string,
      {
        clientName: string;
        projects: ProjectWithStats[];
      }
    > = {};

    filteredProjects.forEach((project) => {
      const clientId = project.clientId || 'no-client';
      const clientName = project.clientName || 'No Client';

      if (!groups[clientId]) {
        groups[clientId] = {
          clientName,
          projects: [],
        };
      }

      groups[clientId].projects.push(project);
    });

    return groups;
  }, [filteredProjects]);

  // Handlers
  const handleCreate = async (data: CreateProjectInput) => {
    setSubmitting(true);
    try {
      projectLogger.debug('Creating project with data:', data);
      const result = await projectService.create(data);
      projectLogger.debug('Created project:', result);
      await loadProjects();
      setShowForm(false);
    } catch (err) {
      projectLogger.error('Failed to create project:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data: UpdateProjectInput) => {
    if (!editingProject) return;
    setSubmitting(true);
    try {
      projectLogger.debug('Updating project:', { id: editingProject.id, data });
      await projectService.update(editingProject.id, data);
      await loadProjects();
      setEditingProject(null);
    } catch (err) {
      projectLogger.error('Failed to update project:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      await projectService.update(projectId, { status: newStatus });
      // Optimistically update the list or reload
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p)),
      );
    } catch (err) {
      projectLogger.error('Failed to update project status:', err);
      // Revert or show error
      setError('Failed to update status');
      loadProjects(); // Reload to ensure consistent state
    }
  };

  const handleDelete = () => {
    if (!deletingProject) return;
    const projectToDelete = deletingProject;
    setDeletingProject(null);

    setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));

    executeUndoable({
      message: `Deleted project "${projectToDelete.name}"`,
      action: async () => {
        await projectService.delete(projectToDelete.id);
      },
      onUndo: () => {
        loadProjects();
      },
    });
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...PROJECT_STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
  ];

  if (loading) {
    return <ListSkeleton />;
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-foreground'>Projects</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className='w-4 h-4' />
          New Project
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className='p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive'>
          {error}
          <button onClick={() => setError(null)} className='ml-2 underline'>
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      {projects.length > 0 && (
        <div className='flex gap-4'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
            <input
              type='text'
              placeholder='Search projects...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
            />
          </div>
          <div className='w-48'>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')}
              options={statusOptions}
            />
          </div>
        </div>
      )}

      {/* List */}
      {projects.length === 0 ? (
        <EmptyState
          icon={<Briefcase className='w-8 h-8' />}
          title='No projects yet'
          description='Create your first project to start tracking time.'
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className='w-4 h-4' />
              Add Project
            </Button>
          }
        />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={<Search className='w-8 h-8' />}
          title='No results'
          description='Try adjusting your search or filters.'
        />
      ) : (
        <div className='space-y-4'>
          {Object.entries(groupedProjects).map(([clientId, group]) => (
            <ClientGroup
              key={clientId}
              clientName={group.clientName}
              projects={group.projects}
              onStatusChange={handleStatusChange}
              onEdit={setEditingProject}
              onDelete={setDeletingProject}
            />
          ))}
        </div>
      )}

      {/* Forms */}
      <ProjectForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreate}
        loading={submitting}
      />

      {editingProject && (
        <ProjectForm
          isOpen={true}
          onClose={() => setEditingProject(null)}
          onSubmit={handleUpdate}
          initialData={editingProject}
          loading={submitting}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDelete}
        title='Delete Project'
        message={`Are you sure you want to delete "${deletingProject?.name}"? This will also delete all time entries for this project.`}
        confirmLabel='Delete'
        variant='danger'
        loading={submitting}
      />
    </div>
  );
}

export function ProjectsList() {
  return (
    <ErrorBoundary name='ProjectsList'>
      <ProjectsListContent />
    </ErrorBoundary>
  );
}

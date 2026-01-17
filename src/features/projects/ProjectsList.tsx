import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Briefcase } from 'lucide-react';
import type { ProjectWithStats, CreateProjectInput, UpdateProjectInput, ProjectStatus } from '../../types';
import { PROJECT_STATUS_OPTIONS } from '../../types';
import { projectService } from '../../services';
import { Button, Card, EmptyState, ConfirmDialog, StatusBadge, Select } from '../../components/ui';
import { ProjectForm } from './ProjectForm';

export function ProjectsList() {
    const [projects, setProjects] = useState<ProjectWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');

    // Modal states
    const [showForm, setShowForm] = useState(false);
    const [editingProject, setEditingProject] = useState<ProjectWithStats | null>(null);
    const [deletingProject, setDeletingProject] = useState<ProjectWithStats | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const data = await projectService.getAllWithStats();
            setProjects(data);
        } catch (err) {
            console.error('Failed to load projects:', err);
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
                (p) =>
                    p.name.toLowerCase().includes(query) ||
                    p.clientName?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [projects, searchQuery, statusFilter]);

    // Handlers
    const handleCreate = async (data: CreateProjectInput) => {
        setSubmitting(true);
        try {
            await projectService.create(data);
            await loadProjects();
            setShowForm(false);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async (data: UpdateProjectInput) => {
        if (!editingProject) return;
        setSubmitting(true);
        try {
            await projectService.update(editingProject.id, data);
            await loadProjects();
            setEditingProject(null);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingProject) return;
        setSubmitting(true);
        try {
            await projectService.delete(deletingProject.id);
            await loadProjects();
            setDeletingProject(null);
        } finally {
            setSubmitting(false);
        }
    };

    const formatHours = (hours: number) => {
        if (hours < 1) return `${Math.round(hours * 60)}m`;
        return `${hours.toFixed(1)}h`;
    };

    const statusOptions = [
        { value: '', label: 'All Statuses' },
        ...PROJECT_STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label })),
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
                <h1 className="text-2xl font-bold text-foreground">Projects</h1>
                <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4" />
                    New Project
                </Button>
            </div>

            {/* Filters */}
            {projects.length > 0 && (
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="w-48">
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
                    icon={<Briefcase className="w-8 h-8" />}
                    title="No projects yet"
                    description="Create your first project to start tracking time."
                    action={
                        <Button onClick={() => setShowForm(true)}>
                            <Plus className="w-4 h-4" />
                            Add Project
                        </Button>
                    }
                />
            ) : filteredProjects.length === 0 ? (
                <EmptyState
                    icon={<Search className="w-8 h-8" />}
                    title="No results"
                    description="Try adjusting your search or filters."
                />
            ) : (
                <div className="space-y-3">
                    {filteredProjects.map((project) => (
                        <Card key={project.id} className="flex items-center gap-4 p-4">
                            {/* Color indicator */}
                            <div
                                className="w-3 h-12 rounded-full flex-shrink-0"
                                style={{ backgroundColor: project.color }}
                            />

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium text-foreground truncate">{project.name}</h3>
                                    <StatusBadge status={project.status} />
                                </div>
                                {project.clientName && (
                                    <p className="text-sm text-muted-foreground truncate">
                                        {project.clientName}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-6 ml-4">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-foreground">
                                        {formatHours(project.totalHours)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">tracked</p>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingProject(project)}
                                        aria-label="Edit project"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeletingProject(project)}
                                        aria-label="Delete project"
                                    >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
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
                title="Delete Project"
                message={`Are you sure you want to delete "${deletingProject?.name}"? This will also delete all time entries for this project.`}
                confirmLabel="Delete"
                variant="danger"
                loading={submitting}
            />
        </div>
    );
}

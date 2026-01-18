import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import type { ProjectWithStats, ProjectStatus } from '../../types';
import { PROJECT_STATUS_OPTIONS } from '../../types';

interface ClientGroupProps {
    clientName: string;
    projects: ProjectWithStats[];
    onStatusChange: (projectId: string, newStatus: ProjectStatus) => void;
    onEdit: (project: ProjectWithStats) => void;
    onDelete: (project: ProjectWithStats) => void;
}

export function ClientGroup({
    clientName,
    projects,
    onStatusChange,
    onEdit,
    onDelete
}: ClientGroupProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!projects) {
        return null;
    }

    const formatHours = (hours: number) => {
        if (typeof hours !== 'number') return '0h';
        if (hours < 1) return `${Math.round(hours * 60)}m`;
        return `${hours.toFixed(1)}h`;
    };

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
                    {projects.length} Projects
                </div>
            </button>

            {isExpanded && (
                <div className="p-2 space-y-2">
                    {projects.map((project) => (
                        <Card key={project.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                            <div
                                className="w-3 h-12 rounded-full flex-shrink-0"
                                style={{ backgroundColor: project.color }}
                            />

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium text-foreground truncate max-w-[300px]">{project.name}</h3>
                                    <div className="relative inline-block">
                                        <select
                                            value={project.status}
                                            onChange={(e) => onStatusChange(project.id, e.target.value as ProjectStatus)}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`appearance-none cursor-pointer pl-2 pr-1 py-0.5 text-xs font-medium rounded-full border-0 ring-1 ring-inset focus:ring-2 focus:ring-primary ${project.status === 'active' ? 'bg-green-100 text-green-800 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/20' :
                                                project.status === 'paused' ? 'bg-orange-100 text-orange-800 ring-orange-600/20 dark:bg-orange-900/30 dark:text-orange-400 dark:ring-orange-500/20' :
                                                    'bg-muted text-muted-foreground ring-gray-500/10 dark:ring-gray-400/20'
                                                }`}
                                        >
                                            {PROJECT_STATUS_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {project.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1 truncate max-w-[500px]">
                                        {project.description}
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
                                        onClick={() => onEdit(project)}
                                        aria-label="Edit project"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onDelete(project)}
                                        aria-label="Delete project"
                                    >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )
            }
        </div >
    );
}

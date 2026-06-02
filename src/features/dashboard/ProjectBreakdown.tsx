import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ProjectBreakdownItem } from '../../services/dashboardService';

function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  return hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}h`;
}

const budgetLabels = {
  none: '',
  ok: 'On track',
  near: 'Near limit',
  over: 'Over budget',
} as const;

interface ProjectBreakdownProps {
  projects: ProjectBreakdownItem[];
}

export function ProjectBreakdown({ projects }: ProjectBreakdownProps) {
  if (projects.length === 0) return null;

  return (
    <div className='app-card p-4'>
      <h3 className='text-sm font-semibold text-foreground mb-3'>Hours by Project</h3>
      <div className='space-y-2.5'>
        {projects.map((project) => {
          const progress = Math.max(project.percentOfTotal, 2) / 100;

          return (
            <div key={project.projectId} className='space-y-1'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div
                    className='w-2.5 h-2.5 rounded-full'
                    style={{ backgroundColor: project.projectColor }}
                  />
                  <span className='text-sm font-medium truncate'>{project.projectName}</span>
                </div>
                <span className='text-xs text-muted-foreground'>
                  {formatHours(project.totalSeconds)}
                </span>
              </div>
              <div className='h-1.5 bg-muted rounded-full overflow-hidden'>
                <div
                  className='h-full origin-left rounded-full transition-transform duration-300'
                  style={{
                    transform: `scaleX(${progress})`,
                    backgroundColor: project.projectColor,
                  }}
                />
              </div>
              {project.budgetStatus !== 'none' && (
                <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                  <span
                    className={`inline-flex min-h-6 items-center gap-1 rounded-full px-2 font-medium ${
                      project.budgetStatus === 'over'
                        ? 'bg-destructive/10 text-destructive'
                        : project.budgetStatus === 'near'
                          ? 'bg-accent/15 text-accent-foreground dark:text-accent'
                          : 'bg-primary/12 text-primary'
                    }`}
                  >
                    {project.budgetStatus === 'ok' ? (
                      <CheckCircle2 className='h-3 w-3' />
                    ) : (
                      <AlertTriangle className='h-3 w-3' />
                    )}
                    {budgetLabels[project.budgetStatus]}
                  </span>
                  <span>{Math.round(project.budgetUsedPercent)}% used</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

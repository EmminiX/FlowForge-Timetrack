import type { ProjectBreakdownItem } from '../../services/dashboardService';

function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  return hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}h`;
}

interface ProjectBreakdownProps {
  projects: ProjectBreakdownItem[];
}

export function ProjectBreakdown({ projects }: ProjectBreakdownProps) {
  if (projects.length === 0) return null;

  return (
    <div className="bg-background border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Hours by Project</h3>
      <div className="space-y-2.5">
        {projects.map((project) => (
          <div key={project.projectId} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: project.projectColor }}
                />
                <span className="text-sm font-medium truncate">{project.projectName}</span>
              </div>
              <span className="text-xs text-muted-foreground">{formatHours(project.totalSeconds)}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(project.percentOfTotal, 2)}%`,
                  backgroundColor: project.projectColor,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

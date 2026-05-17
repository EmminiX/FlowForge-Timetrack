import { Card } from '../../components/ui';
import { Clock } from 'lucide-react';
import { formatDuration } from '../../types';

interface ProjectSummary {
  projectId: string;
  projectName: string;
  projectColor: string;
  totalSeconds: number;
}

interface TodaySummaryProps {
  totalSeconds: number;
  projects: ProjectSummary[];
}

export function TodaySummary({ totalSeconds, projects }: TodaySummaryProps) {
  const maxSeconds = Math.max(...projects.map((p) => p.totalSeconds), 1);

  return (
    <Card className='p-4'>
      <div className='flex items-center gap-2 mb-3'>
        <Clock className='w-4 h-4 text-muted-foreground' />
        <h3 className='font-semibold text-sm uppercase tracking-wide text-muted-foreground'>
          Today's Summary
        </h3>
      </div>

      <div className='mb-4 flex items-baseline gap-2'>
        <span className='text-2xl font-bold'>{formatDuration(totalSeconds)}</span>
        <span className='text-sm text-muted-foreground'>tracked</span>
      </div>

      {projects.length === 0 ? (
        <p className='text-muted-foreground text-sm'>No time tracked today</p>
      ) : (
        <div className='space-y-2'>
          {projects.map((project) => {
            const progress = project.totalSeconds / maxSeconds;

            return (
              <div key={project.projectId} className='flex items-center gap-3'>
                <div
                  className='w-3 h-3 rounded-full shrink-0'
                  style={{ backgroundColor: project.projectColor }}
                />
                <span className='flex-1 text-sm truncate'>{project.projectName}</span>
                <span className='text-sm text-muted-foreground whitespace-nowrap'>
                  {formatDuration(project.totalSeconds)}
                </span>
                <div className='h-2 w-32 overflow-hidden rounded-full bg-muted'>
                  <div
                    className='h-full origin-left rounded-full transition-transform duration-500'
                    style={{
                      transform: `scaleX(${progress})`,
                      backgroundColor: project.projectColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

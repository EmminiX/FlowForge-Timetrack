import { Card, Button } from '../../components/ui';
import { BarChart3, Maximize2, Minimize2 } from 'lucide-react';
import { formatDuration } from '../../types';

interface DaySummary {
  date: string;
  dayOfWeek: string;
  totalSeconds: number;
}

interface WeeklyChartProps {
  days: DaySummary[];
  totalSeconds: number;
  range?: 'week' | 'month';
  onRangeChange?: (range: 'week' | 'month') => void;
}

export function WeeklyChart({
  days,
  totalSeconds,
  range = 'week',
  onRangeChange,
}: WeeklyChartProps) {
  const maxSeconds = Math.max(...days.map((d) => d.totalSeconds), 1);
  const today = new Date().toISOString().split('T')[0];

  return (
    <Card className='p-4'>
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-2'>
          <BarChart3 className='w-4 h-4 text-muted-foreground' />
          <h3 className='font-semibold text-sm uppercase tracking-wide text-muted-foreground'>
            {range === 'week' ? 'This Week' : 'Last 30 Days'}
          </h3>
        </div>
        <div className='flex items-center gap-3'>
          <span className='text-sm text-muted-foreground'>
            {formatDuration(totalSeconds)} total
          </span>
          {onRangeChange && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onRangeChange(range === 'week' ? 'month' : 'week')}
              className='h-6 w-6 p-0 hover:bg-muted'
              title={range === 'week' ? 'Show last 30 days' : 'Show this week'}
            >
              {range === 'week' ? (
                <Maximize2 className='w-4 h-4 text-muted-foreground' />
              ) : (
                <Minimize2 className='w-4 h-4 text-muted-foreground' />
              )}
            </Button>
          )}
        </div>
      </div>

      <div
        className={`flex items-end justify-between h-20 ${range === 'month' ? 'gap-0.5' : 'gap-2'}`}
      >
        {days.map((day, index) => {
          const heightPercent =
            day.totalSeconds > 0 ? Math.max((day.totalSeconds / maxSeconds) * 100, 5) : 0;
          const isToday = day.date === today;

          // Logic for showing labels:
          // Week: Show all
          // Month: Show every 3rd or 4th day + today, start/end?
          // Let's show start, end, and today, plus maybe Mondays?
          // Simple approach: Show if it's Monday or 1st/15th, or just index % 5 === 0
          const showLabel = range === 'week' || index % 5 === 0 || index === days.length - 1;

          return (
            <div
              key={day.date}
              className={`flex-1 flex flex-col items-center gap-1 min-w-[${range === 'month' ? '8px' : 'auto'}]`}
              title={`${day.date}: ${formatDuration(day.totalSeconds)}`}
            >
              <div className='w-full h-16 flex items-end justify-center'>
                <div
                  className={`w-full max-w-[40px] rounded-t transition-all duration-500 ${
                    isToday
                      ? 'bg-primary'
                      : day.totalSeconds > 0
                        ? 'bg-primary/60'
                        : range === 'month'
                          ? 'bg-muted/50'
                          : 'bg-muted'
                  }`}
                  style={{
                    height: `${heightPercent}%`,
                    minHeight: day.totalSeconds > 0 ? '4px' : '2px',
                  }}
                />
              </div>
              <span
                className={`text-[10px] ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'} h-3 overflow-hidden whitespace-nowrap`}
              >
                {showLabel
                  ? range === 'month' && day.dayOfWeek === 'Mon'
                    ? 'M'
                    : day.dayOfWeek.slice(0, 3)
                  : ''}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

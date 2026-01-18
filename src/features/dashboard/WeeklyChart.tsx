import { Card } from '../../components/ui';
import { BarChart3 } from 'lucide-react';
import { formatDuration } from '../../types';

interface DaySummary {
    date: string;
    dayOfWeek: string;
    totalSeconds: number;
}

interface WeeklyChartProps {
    days: DaySummary[];
    totalSeconds: number;
}

export function WeeklyChart({ days, totalSeconds }: WeeklyChartProps) {
    const maxSeconds = Math.max(...days.map(d => d.totalSeconds), 1);
    const today = new Date().toISOString().split('T')[0];

    return (
        <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        This Week
                    </h3>
                </div>
                <span className="text-sm text-muted-foreground">
                    {formatDuration(totalSeconds)} total
                </span>
            </div>

            <div className="flex items-end justify-between gap-2 h-20">
                {days.map(day => {
                    const heightPercent = day.totalSeconds > 0
                        ? Math.max((day.totalSeconds / maxSeconds) * 100, 5)
                        : 0;
                    const isToday = day.date === today;

                    return (
                        <div
                            key={day.date}
                            className="flex-1 flex flex-col items-center gap-1"
                        >
                            <div className="w-full h-16 flex items-end">
                                <div
                                    className={`w-full rounded-t transition-all duration-500 ${isToday
                                            ? 'bg-primary'
                                            : day.totalSeconds > 0
                                                ? 'bg-primary/60'
                                                : 'bg-muted'
                                        }`}
                                    style={{ height: `${heightPercent}%`, minHeight: day.totalSeconds > 0 ? '4px' : '2px' }}
                                    title={`${day.dayOfWeek}: ${formatDuration(day.totalSeconds)}`}
                                />
                            </div>
                            <span className={`text-xs ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                                {day.dayOfWeek}
                            </span>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

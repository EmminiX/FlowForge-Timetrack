import { useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { dashboardService, type MonthSummary } from '../../services/dashboardService';
import { formatDuration } from '../../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthlyStatsProps {
  initialData: MonthSummary;
}

export function MonthlyStats({ initialData }: MonthlyStatsProps) {
  const [data, setData] = useState<MonthSummary>(initialData);
  const [year, setYear] = useState(initialData.year);
  const [month, setMonth] = useState(initialData.month);

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const monthLabel = `${MONTH_NAMES[month]} ${year}`;

  const goPrev = async () => {
    const newMonth = month === 0 ? 11 : month - 1;
    const newYear = month === 0 ? year - 1 : year;
    try {
      const summary = await dashboardService.getMonthSummary(newYear, newMonth);
      setMonth(newMonth);
      setYear(newYear);
      setData(summary);
    } catch {
      // State unchanged — UI stays on current month
    }
  };

  const goNext = async () => {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth()) return;
    const newMonth = month === 11 ? 0 : month + 1;
    const newYear = month === 11 ? year + 1 : year;
    try {
      const summary = await dashboardService.getMonthSummary(newYear, newMonth);
      setMonth(newMonth);
      setYear(newYear);
      setData(summary);
    } catch {
      // State unchanged — UI stays on current month
    }
  };

  // Calculate % change vs previous month
  const percentChange =
    data.previousMonthSeconds > 0
      ? ((data.totalSeconds - data.previousMonthSeconds) / data.previousMonthSeconds) * 100
      : null;

  return (
    <div className="bg-background border border-border rounded-xl p-4">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={goPrev} className="p-1 hover:bg-muted rounded">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold">{monthLabel}</h3>
        <button
          onClick={goNext}
          disabled={isCurrentMonth}
          className="p-1 hover:bg-muted rounded disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Total Hours */}
        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
          <div className="text-xs text-muted-foreground mb-1">Total Hours</div>
          <div className="text-sm font-semibold text-foreground">
            {formatDuration(data.totalSeconds)}
          </div>
          {percentChange !== null && (
            <div
              className={`flex items-center justify-center gap-0.5 mt-1 text-xs font-medium ${
                percentChange >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {percentChange >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(percentChange).toFixed(0)}%
            </div>
          )}
          {percentChange === null && data.totalSeconds > 0 && (
            <div className="flex items-center justify-center mt-1 text-xs text-muted-foreground">
              No prev data
            </div>
          )}
        </div>

        {/* Days Worked */}
        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
          <div className="text-xs text-muted-foreground mb-1">Days Worked</div>
          <div className="text-sm font-semibold text-foreground">{data.daysWorked}</div>
        </div>

        {/* Avg per Day */}
        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
          <div className="text-xs text-muted-foreground mb-1">Avg per Day</div>
          <div className="text-sm font-semibold text-foreground">
            {formatDuration(data.avgSecondsPerDay)}
          </div>
        </div>
      </div>
    </div>
  );
}

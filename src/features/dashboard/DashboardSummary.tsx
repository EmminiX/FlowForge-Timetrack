import { useState, useEffect } from 'react';
import { dashboardService, DashboardData } from '../../services/dashboardService';
import { TodaySummary } from './TodaySummary';
import { WeeklyChart } from './WeeklyChart';
import { QuickStats } from './QuickStats';

import { listen } from '@tauri-apps/api/event';

export function DashboardSummary() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState<'week' | 'month'>('week');
  const [chartData, setChartData] = useState<{
    totalSeconds: number;
    days: import('../../services/dashboardService').DaySummary[];
  } | null>(null);

  const loadData = async () => {
    try {
      const dashboardData = await dashboardService.getDashboardData();
      setData(dashboardData);
      // Initialize chart data with the week data from dashboard response
      // Only if we haven't set it yet or if we are in week mode
      if (chartRange === 'week') {
        setChartData(dashboardData.week);
      } else {
        // If we are in month mode, we need to fetch specific month data because getDashboardData returns week
        const monthData = await dashboardService.getWeekSummary('month');
        setChartData(monthData);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Effect to handle range changes
  useEffect(() => {
    const fetchChart = async () => {
      if (!data) return; // Wait for initial load
      try {
        const summary = await dashboardService.getWeekSummary(chartRange);
        setChartData(summary);
      } catch (error) {
        console.error('Failed to load chart data:', error);
      }
    };
    fetchChart();
  }, [chartRange]);

  useEffect(() => {
    loadData();

    // Refresh every minute to keep data current
    const interval = setInterval(loadData, 60000);

    // Listen for updates from timer stop
    const unlisten = listen('time-entry-saved', () => {
      console.log('[Dashboard] New time entry saved, refreshing data...');
      loadData();
    });

    return () => {
      clearInterval(interval);
      unlisten
        .then((f) => f())
        .catch(() => {
          /* Already unlistened */
        });
    };
  }, []);

  if (loading) {
    return (
      <div className='space-y-4 mt-6'>
        <div className='bg-background border border-border rounded-xl p-4 animate-pulse h-32' />
        <div className='bg-background border border-border rounded-xl p-4 animate-pulse h-24' />
        <div className='bg-background border border-border rounded-xl p-4 animate-pulse h-20' />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className='space-y-4 mt-6'>
      <TodaySummary totalSeconds={data.today.totalSeconds} projects={data.today.projects} />
      <WeeklyChart
        days={chartData?.days || []}
        totalSeconds={chartData?.totalSeconds || 0}
        range={chartRange}
        onRangeChange={setChartRange}
      />
      <QuickStats
        unbilledAmounts={data.unbilled.amountsByCurrency}
        billedAmounts={data.billed.amountsByCurrency}
        weeklySeconds={data.week.totalSeconds}
        totalSeconds={data.total.totalSeconds}
      />
    </div>
  );
}

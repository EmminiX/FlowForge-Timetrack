import { useState, useEffect } from 'react';
import { dashboardService, DashboardData } from '../../services/dashboardService';
import { TodaySummary } from './TodaySummary';
import { WeeklyChart } from './WeeklyChart';
import { QuickStats } from './QuickStats';

export function DashboardSummary() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const dashboardData = await dashboardService.getDashboardData();
                setData(dashboardData);
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
        // Refresh every minute to keep data current
        const interval = setInterval(loadData, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="space-y-4 mt-6">
                <div className="bg-background border border-border rounded-xl p-4 animate-pulse h-32" />
                <div className="bg-background border border-border rounded-xl p-4 animate-pulse h-24" />
                <div className="bg-background border border-border rounded-xl p-4 animate-pulse h-20" />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-4 mt-6">
            <TodaySummary
                totalSeconds={data.today.totalSeconds}
                projects={data.today.projects}
            />
            <WeeklyChart
                days={data.week.days}
                totalSeconds={data.week.totalSeconds}
            />
            <QuickStats
                unbilledAmount={data.unbilled.totalAmount}
                weeklyHours={data.week.totalSeconds / 3600}
            />
        </div>
    );
}

// Dashboard service for aggregating analytics data

import { getDb } from '../lib/db';

export interface ProjectSummary {
    projectId: string;
    projectName: string;
    projectColor: string;
    totalSeconds: number;
}

export interface DaySummary {
    date: string;           // ISO date string
    dayOfWeek: string;      // Mon, Tue, etc.
    totalSeconds: number;
}

export interface DashboardData {
    today: {
        totalSeconds: number;
        projects: ProjectSummary[];
    };
    week: {
        totalSeconds: number;
        days: DaySummary[];
    };
    unbilled: {
        totalAmount: number;
        hoursCount: number;
    };
}

export const dashboardService = {
    async getTodaySummary(): Promise<{ totalSeconds: number; projects: ProjectSummary[] }> {
        const db = await getDb();
        const today = new Date().toISOString().split('T')[0];

        const result = await db.select<Array<{
            project_id: string;
            project_name: string;
            color: string;
            total_seconds: number;
        }>>(
            `SELECT 
        p.id as project_id,
        p.name as project_name,
        p.color,
        SUM(
          CASE 
            WHEN te.end_time IS NULL THEN 
              (strftime('%s', 'now') - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
            ELSE 
              (strftime('%s', te.end_time) - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
          END
        ) as total_seconds
      FROM time_entries te
      JOIN projects p ON te.project_id = p.id
      WHERE date(te.start_time) = ?
      GROUP BY p.id
      ORDER BY total_seconds DESC`,
            [today]
        );

        const projects = result.map(r => ({
            projectId: r.project_id,
            projectName: r.project_name,
            projectColor: r.color || '#6366f1',
            totalSeconds: r.total_seconds || 0
        }));

        const totalSeconds = projects.reduce((sum, p) => sum + p.totalSeconds, 0);

        return { totalSeconds, projects };
    },

    async getWeekSummary(): Promise<{ totalSeconds: number; days: DaySummary[] }> {
        const db = await getDb();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Get start of current week (Monday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);

        const result = await db.select<Array<{
            date: string;
            total_seconds: number;
        }>>(
            `SELECT 
        date(te.start_time) as date,
        SUM(
          CASE 
            WHEN te.end_time IS NULL THEN 
              (strftime('%s', 'now') - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
            ELSE 
              (strftime('%s', te.end_time) - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
          END
        ) as total_seconds
      FROM time_entries te
      WHERE date(te.start_time) >= date(?)
      GROUP BY date(te.start_time)
      ORDER BY date`,
            [monday.toISOString()]
        );

        // Build all 7 days of the week
        const days: DaySummary[] = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const found = result.find(r => r.date === dateStr);
            days.push({
                date: dateStr,
                dayOfWeek: dayNames[date.getDay()],
                totalSeconds: found?.total_seconds || 0
            });
        }

        const totalSeconds = days.reduce((sum, d) => sum + d.totalSeconds, 0);

        return { totalSeconds, days };
    },

    async getUnbilledSummary(): Promise<{ totalAmount: number; hoursCount: number }> {
        const db = await getDb();

        const result = await db.select<Array<{
            total_seconds: number;
            total_amount: number;
        }>>(
            `SELECT 
        SUM(
          CASE 
            WHEN te.end_time IS NULL THEN 
              (strftime('%s', 'now') - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
            ELSE 
              (strftime('%s', te.end_time) - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
          END
        ) as total_seconds,
        SUM(
          (CASE 
            WHEN te.end_time IS NULL THEN 
              (strftime('%s', 'now') - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
            ELSE 
              (strftime('%s', te.end_time) - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
          END) / 3600.0 * COALESCE(c.hourly_rate, 0)
        ) as total_amount
      FROM time_entries te
      JOIN projects p ON te.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      WHERE te.is_billable = 1 AND te.is_billed = 0`
        );

        return {
            totalAmount: result[0]?.total_amount || 0,
            hoursCount: (result[0]?.total_seconds || 0) / 3600
        };
    },

    async getDashboardData(): Promise<DashboardData> {
        const [today, week, unbilled] = await Promise.all([
            this.getTodaySummary(),
            this.getWeekSummary(),
            this.getUnbilledSummary()
        ]);

        return { today, week, unbilled };
    }
};

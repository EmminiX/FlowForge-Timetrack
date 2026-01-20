// Dashboard service for aggregating analytics data

import { getDb } from '../lib/db';

export interface ProjectSummary {
  projectId: string;
  projectName: string;
  projectColor: string;
  totalSeconds: number;
}

export interface DaySummary {
  date: string; // ISO date string
  dayOfWeek: string; // Mon, Tue, etc.
  totalSeconds: number;
}

export interface CurrencyAmount {
  currency: string;
  amount: number;
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
    amountsByCurrency: CurrencyAmount[];
    hoursCount: number;
  };
  billed: {
    amountsByCurrency: CurrencyAmount[];
  };
  total: {
    totalSeconds: number;
  };
}

export const dashboardService = {
  async getTodaySummary(): Promise<{ totalSeconds: number; projects: ProjectSummary[] }> {
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];

    const result = await db.select<
      Array<{
        project_id: string;
        project_name: string;
        color: string;
        total_seconds: number;
      }>
    >(
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
      [today],
    );

    const projects = result.map((r) => ({
      projectId: r.project_id,
      projectName: r.project_name,
      projectColor: r.color || '#6366f1',
      totalSeconds: r.total_seconds || 0,
    }));

    const totalSeconds = projects.reduce((sum, p) => sum + p.totalSeconds, 0);

    return { totalSeconds, projects };
  },

  async getWeekSummary(
    range: 'week' | 'month' = 'week',
  ): Promise<{ totalSeconds: number; days: DaySummary[] }> {
    const db = await getDb();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let startDate: Date;
    let daysCount: number;

    const now = new Date();

    if (range === 'week') {
      // Start of current week (Monday)
      // If today is Sunday (0), offset is -6. If Mon (1), offset is 0.
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(now);
      startDate.setDate(now.getDate() + mondayOffset);
      startDate.setHours(0, 0, 0, 0);
      daysCount = 7;
    } else {
      // Last 30 days
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 29); // 30 days ago including today
      startDate.setHours(0, 0, 0, 0);
      daysCount = 30;
    }

    const result = await db.select<
      Array<{
        date: string;
        total_seconds: number;
      }>
    >(
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
      [startDate.toISOString()],
    );

    // Build days array
    const days: DaySummary[] = [];
    for (let i = 0; i < daysCount; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const found = result.find((r) => r.date === dateStr);
      days.push({
        date: dateStr,
        dayOfWeek: i % 7 === 0 || range === 'week' ? dayNames[date.getDay()] : '', // Only show label for weeks or start of weeks? Actually let's pass dayName always and handle hiding in UI
        totalSeconds: found?.total_seconds || 0,
      });
    }

    // Fix day names for month view (showing all might be crowded)
    // We'll return full day names and let the UI decide how to render labels
    days.forEach((d) => {
      const dateObj = new Date(d.date);
      d.dayOfWeek = dayNames[dateObj.getDay()];
    });

    const totalSeconds = days.reduce((sum, d) => sum + d.totalSeconds, 0);

    return { totalSeconds, days };
  },

  async getUnbilledSummary(): Promise<{ amountsByCurrency: CurrencyAmount[]; hoursCount: number }> {
    const db = await getDb();

    // Get amounts grouped by currency
    const currencyResult = await db.select<
      Array<{
        currency: string;
        total_amount: number;
      }>
    >(
      `SELECT 
        COALESCE(c.currency, 'EUR') as currency,
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
      WHERE te.is_billable = 1 AND te.is_billed = 0
      GROUP BY COALESCE(c.currency, 'EUR')`,
    );

    // Get total hours
    const hoursResult = await db.select<
      Array<{
        total_seconds: number;
      }>
    >(
      `SELECT 
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
      JOIN clients c ON p.client_id = c.id
      WHERE te.is_billable = 1 AND te.is_billed = 0`,
    );

    return {
      amountsByCurrency: currencyResult.map((r) => ({
        currency: r.currency,
        amount: r.total_amount || 0,
      })),
      hoursCount: (hoursResult[0]?.total_seconds || 0) / 3600,
    };
  },

  async getBilledSummary(): Promise<{ amountsByCurrency: CurrencyAmount[] }> {
    const db = await getDb();

    // Get amounts grouped by currency for billed entries
    const currencyResult = await db.select<
      Array<{
        currency: string;
        total_amount: number;
      }>
    >(
      `SELECT 
        COALESCE(c.currency, 'EUR') as currency,
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
      WHERE te.is_billed = 1
      GROUP BY COALESCE(c.currency, 'EUR')`,
    );

    return {
      amountsByCurrency: currencyResult.map((r) => ({
        currency: r.currency,
        amount: r.total_amount || 0,
      })),
    };
  },

  async getAllTimeTotal(): Promise<{ totalSeconds: number }> {
    const db = await getDb();
    const result = await db.select<Array<{ total_seconds: number }>>(
      `SELECT 
        SUM(
          CASE 
            WHEN end_time IS NULL THEN 
              (strftime('%s', 'now') - strftime('%s', start_time) - COALESCE(pause_duration, 0))
            ELSE 
              (strftime('%s', end_time) - strftime('%s', start_time) - COALESCE(pause_duration, 0))
          END
        ) as total_seconds
      FROM time_entries`,
    );
    return { totalSeconds: result[0]?.total_seconds || 0 };
  },

  async getDashboardData(): Promise<DashboardData> {
    const [today, week, unbilled, billed, total] = await Promise.all([
      this.getTodaySummary(),
      this.getWeekSummary(),
      this.getUnbilledSummary(),
      this.getBilledSummary(),
      this.getAllTimeTotal(),
    ]);

    return { today, week, unbilled, billed, total };
  },
};

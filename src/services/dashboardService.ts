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

export interface ClientSummary {
  clientId: string;
  clientName: string;
  totalSeconds: number;
  unbilledAmount: number;
  billedAmount: number;
  downPaymentTotal: number;
  currency: string;
}

export interface MonthSummary {
  year: number;
  month: number; // 0-11
  totalSeconds: number;
  daysWorked: number;
  avgSecondsPerDay: number;
  previousMonthSeconds: number;
  perDay: DaySummary[];
}

export interface ProjectBreakdownItem {
  projectId: string;
  projectName: string;
  projectColor: string;
  totalSeconds: number;
  percentOfTotal: number;
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
  clientBreakdown: ClientSummary[];
  monthSummary: MonthSummary;
  projectBreakdown: ProjectBreakdownItem[];
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

  async getDownPaymentTotalsByClient(): Promise<Array<{ clientId: string; total: number }>> {
    const db = await getDb();
    const result = await db.select<Array<{ client_id: string; total: number }>>(
      `SELECT client_id, COALESCE(SUM(amount), 0) as total
       FROM down_payments
       GROUP BY client_id`,
    );
    return result.map((r) => ({ clientId: r.client_id, total: r.total || 0 }));
  },

  async getClientBreakdown(): Promise<ClientSummary[]> {
    const db = await getDb();
    const [timeResult, paymentTotals] = await Promise.all([
      db.select<Array<{
        client_id: string;
        client_name: string;
        currency: string;
        total_seconds: number;
        unbilled_amount: number;
        billed_amount: number;
      }>>(
        `SELECT
          c.id as client_id,
          c.name as client_name,
          COALESCE(c.currency, 'EUR') as currency,
          COALESCE(SUM(
            CASE
              WHEN te.end_time IS NULL THEN
                (strftime('%s', 'now') - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
              ELSE
                (strftime('%s', te.end_time) - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
            END
          ), 0) as total_seconds,
          COALESCE(SUM(
            CASE WHEN te.is_billable = 1 AND te.is_billed = 0 THEN
              (CASE
                WHEN te.end_time IS NULL THEN
                  (strftime('%s', 'now') - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
                ELSE
                  (strftime('%s', te.end_time) - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
              END) / 3600.0 * COALESCE(c.hourly_rate, 0)
            ELSE 0 END
          ), 0) as unbilled_amount,
          COALESCE(SUM(
            CASE WHEN te.is_billed = 1 THEN
              (CASE
                WHEN te.end_time IS NULL THEN
                  (strftime('%s', 'now') - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
                ELSE
                  (strftime('%s', te.end_time) - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
              END) / 3600.0 * COALESCE(c.hourly_rate, 0)
            ELSE 0 END
          ), 0) as billed_amount
        FROM time_entries te
        JOIN projects p ON te.project_id = p.id
        JOIN clients c ON p.client_id = c.id
        GROUP BY c.id
        ORDER BY total_seconds DESC`,
      ),
      this.getDownPaymentTotalsByClient(),
    ]);

    const paymentMap = new Map(paymentTotals.map((p) => [p.clientId, p.total]));

    return timeResult.map((r) => ({
      clientId: r.client_id,
      clientName: r.client_name,
      totalSeconds: r.total_seconds || 0,
      unbilledAmount: r.unbilled_amount || 0,
      billedAmount: r.billed_amount || 0,
      downPaymentTotal: paymentMap.get(r.client_id) || 0,
      currency: r.currency,
    }));
  },

  async getMonthSummary(year: number, month: number): Promise<MonthSummary> {
    const db = await getDb();

    // Build date range for the requested month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayStr = firstDay.toISOString().split('T')[0];
    const lastDayStr = lastDay.toISOString().split('T')[0];

    // Build date range for the previous month
    const prevFirstDay = new Date(year, month - 1, 1);
    const prevLastDay = new Date(year, month, 0);
    const prevFirstDayStr = prevFirstDay.toISOString().split('T')[0];
    const prevLastDayStr = prevLastDay.toISOString().split('T')[0];

    const durationCalc = `CASE
      WHEN te.end_time IS NULL THEN
        (strftime('%s', 'now') - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
      ELSE
        (strftime('%s', te.end_time) - strftime('%s', te.start_time) - COALESCE(te.pause_duration, 0))
    END`;

    // Query current month grouped by day
    const currentMonthResult = await db.select<
      Array<{ date: string; total_seconds: number }>
    >(
      `SELECT date(te.start_time) as date, SUM(${durationCalc}) as total_seconds
       FROM time_entries te
       WHERE date(te.start_time) >= ? AND date(te.start_time) <= ?
       GROUP BY date(te.start_time)
       ORDER BY date`,
      [firstDayStr, lastDayStr],
    );

    // Query previous month total for comparison
    const prevMonthResult = await db.select<
      Array<{ total_seconds: number }>
    >(
      `SELECT SUM(${durationCalc}) as total_seconds
       FROM time_entries te
       WHERE date(te.start_time) >= ? AND date(te.start_time) <= ?`,
      [prevFirstDayStr, prevLastDayStr],
    );

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const perDay: DaySummary[] = currentMonthResult.map((r) => ({
      date: r.date,
      dayOfWeek: dayNames[new Date(r.date).getDay()],
      totalSeconds: r.total_seconds || 0,
    }));

    const totalSeconds = perDay.reduce((sum, d) => sum + d.totalSeconds, 0);
    const daysWorked = perDay.filter((d) => d.totalSeconds > 0).length;
    const avgSecondsPerDay = daysWorked > 0 ? totalSeconds / daysWorked : 0;
    const previousMonthSeconds = prevMonthResult[0]?.total_seconds || 0;

    return {
      year,
      month,
      totalSeconds,
      daysWorked,
      avgSecondsPerDay,
      previousMonthSeconds,
      perDay,
    };
  },

  async getProjectBreakdown(): Promise<ProjectBreakdownItem[]> {
    const db = await getDb();

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
      GROUP BY p.id
      ORDER BY total_seconds DESC`,
    );

    const grandTotal = result.reduce((sum, r) => sum + (r.total_seconds || 0), 0);

    return result.map((r) => ({
      projectId: r.project_id,
      projectName: r.project_name,
      projectColor: r.color || '#6366f1',
      totalSeconds: r.total_seconds || 0,
      percentOfTotal: grandTotal > 0 ? ((r.total_seconds || 0) / grandTotal) * 100 : 0,
    }));
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
    const now = new Date();
    const [today, week, unbilled, billed, total, clientBreakdown, monthSummary, projectBreakdown] = await Promise.all([
      this.getTodaySummary(),
      this.getWeekSummary(),
      this.getUnbilledSummary(),
      this.getBilledSummary(),
      this.getAllTimeTotal(),
      this.getClientBreakdown(),
      this.getMonthSummary(now.getFullYear(), now.getMonth()),
      this.getProjectBreakdown(),
    ]);

    return { today, week, unbilled, billed, total, clientBreakdown, monthSummary, projectBreakdown };
  },
};

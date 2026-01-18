// TimeEntry CRUD service

import { getDb } from '../lib/db';
import { timeEntryLogger } from '../lib/logger';
import type {
    TimeEntry,
    TimeEntryWithProject,
    CreateTimeEntryInput,
    UpdateTimeEntryInput
} from '../types';

function generateId(): string {
    return crypto.randomUUID();
}

function now(): string {
    return new Date().toISOString();
}

export interface TimeEntryFilters {
    projectId?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
    isBillable?: boolean;
    isBilled?: boolean;
}

export const timeEntryService = {

    // Get all time entries with project info
    async getAll(filters?: TimeEntryFilters): Promise<TimeEntryWithProject[]> {
        const db = await getDb();

        let query = `
      SELECT 
        te.id,
        te.project_id as projectId,
        te.start_time as startTime,
        te.end_time as endTime,
        te.pause_duration as pauseDuration,
        te.notes,
        te.is_billable as isBillable,
        te.is_billed as isBilled,
        te.created_at as createdAt,
        p.name as projectName,
        p.color as projectColor,
        p.client_id as clientId,
        c.name as clientName
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id
      LEFT JOIN clients c ON c.id = p.client_id
      WHERE 1=1
    `;

        const params: (string | number | boolean)[] = [];
        let paramIndex = 1;

        if (filters?.projectId) {
            query += ` AND te.project_id = $${paramIndex++}`;
            params.push(filters.projectId);
        }
        if (filters?.clientId) {
            query += ` AND p.client_id = $${paramIndex++}`;
            params.push(filters.clientId);
        }
        if (filters?.startDate) {
            query += ` AND te.start_time >= $${paramIndex++}`;
            params.push(filters.startDate);
        }
        if (filters?.endDate) {
            query += ` AND te.start_time <= $${paramIndex++}`;
            params.push(filters.endDate);
        }
        if (filters?.isBillable !== undefined) {
            query += ` AND te.is_billable = $${paramIndex++}`;
            params.push(filters.isBillable ? 1 : 0);
        }
        if (filters?.isBilled !== undefined) {
            query += ` AND te.is_billed = $${paramIndex++}`;
            params.push(filters.isBilled ? 1 : 0);
        }

        query += ` ORDER BY te.start_time DESC`;

        const result = await db.select<TimeEntryWithProject[]>(query, params);

        // Convert SQLite integers to booleans
        return result.map(entry => ({
            ...entry,
            isBillable: Boolean(entry.isBillable),
            isBilled: Boolean(entry.isBilled),
        }));
    },

    // Get running time entry (if any)
    async getRunning(): Promise<TimeEntryWithProject | null> {
        const db = await getDb();
        const result = await db.select<TimeEntryWithProject[]>(`
      SELECT 
        te.id,
        te.project_id as projectId,
        te.start_time as startTime,
        te.end_time as endTime,
        te.pause_duration as pauseDuration,
        te.notes,
        te.is_billable as isBillable,
        te.is_billed as isBilled,
        te.created_at as createdAt,
        p.name as projectName,
        p.color as projectColor,
        p.client_id as clientId,
        c.name as clientName
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id
      LEFT JOIN clients c ON c.id = p.client_id
      WHERE te.end_time IS NULL
      LIMIT 1
    `);

        if (result[0]) {
            return {
                ...result[0],
                isBillable: Boolean(result[0].isBillable),
                isBilled: Boolean(result[0].isBilled),
            };
        }
        return null;
    },

    // Get unbilled entries for a project
    async getUnbilledByProject(projectId: string): Promise<TimeEntry[]> {
        timeEntryLogger.debug('getUnbilledByProject called', { projectId });
        try {
            const db = await getDb();
            const result = await db.select<TimeEntry[]>(`
          SELECT 
            id,
            project_id as projectId,
            start_time as startTime,
            end_time as endTime,
            pause_duration as pauseDuration,
            notes,
            is_billable as isBillable,
            is_billed as isBilled,
            created_at as createdAt
          FROM time_entries
          WHERE project_id = $1 
            AND is_billable = 1 
            AND is_billed = 0
            AND end_time IS NOT NULL
          ORDER BY start_time ASC
        `, [projectId]);

            timeEntryLogger.info('getUnbilledByProject completed', {
                projectId,
                count: result.length,
                entries: result.map(e => ({ id: e.id, isBillable: e.isBillable, isBilled: e.isBilled, endTime: e.endTime }))
            });

            return result.map(entry => ({
                ...entry,
                isBillable: Boolean(entry.isBillable),
                isBilled: Boolean(entry.isBilled),
            }));
        } catch (error) {
            timeEntryLogger.error('getUnbilledByProject failed', error, { projectId });
            throw error;
        }
    },


    // Get by ID
    async getById(id: string): Promise<TimeEntry | null> {
        const db = await getDb();
        const result = await db.select<TimeEntry[]>(`
      SELECT 
        id,
        project_id as projectId,
        start_time as startTime,
        end_time as endTime,
        pause_duration as pauseDuration,
        notes,
        is_billable as isBillable,
        is_billed as isBilled,
        created_at as createdAt
      FROM time_entries
      WHERE id = $1
    `, [id]);

        if (result[0]) {
            return {
                ...result[0],
                isBillable: Boolean(result[0].isBillable),
                isBilled: Boolean(result[0].isBilled),
            };
        }
        return null;
    },

    // Create (start a timer)
    async create(input: CreateTimeEntryInput): Promise<TimeEntry> {
        timeEntryLogger.info('create called', { projectId: input.projectId });
        try {
            const db = await getDb();
            const id = generateId();
            const timestamp = now();

            await db.execute(`
          INSERT INTO time_entries (id, project_id, start_time, end_time, pause_duration, notes, is_billable, is_billed, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
                id,
                input.projectId,
                input.startTime,
                input.endTime || null,
                input.pauseDuration || 0,
                input.notes || '',
                input.isBillable ? 1 : 0,
                input.isBilled ? 1 : 0,
                timestamp,
            ]);

            timeEntryLogger.info('create successful', { id });
            return {
                id,
                projectId: input.projectId,
                startTime: input.startTime,
                endTime: input.endTime || null,
                pauseDuration: input.pauseDuration || 0,
                notes: input.notes || '',
                isBillable: input.isBillable ?? true,
                isBilled: input.isBilled ?? false,
                createdAt: timestamp,
            };
        } catch (error) {
            timeEntryLogger.error('create failed', error, { input });
            throw error;
        }
    },

    // Update
    async update(id: string, input: UpdateTimeEntryInput): Promise<TimeEntry | null> {
        timeEntryLogger.info('update called', { id });
        try {
            const db = await getDb();
            const existing = await this.getById(id);
            if (!existing) {
                timeEntryLogger.warn('update: entry not found', { id });
                return null;
            }

            const updated = {
                ...existing,
                ...input,
            };

            await db.execute(`
          UPDATE time_entries SET
            start_time = $1,
            end_time = $2,
            pause_duration = $3,
            notes = $4,
            is_billable = $5,
            is_billed = $6
          WHERE id = $7
        `, [
                updated.startTime,
                updated.endTime,
                updated.pauseDuration,
                updated.notes,
                updated.isBillable ? 1 : 0,
                updated.isBilled ? 1 : 0,
                id,
            ]);

            timeEntryLogger.info('update successful', { id });
            return updated;
        } catch (error) {
            timeEntryLogger.error('update failed', error, { id, input });
            throw error;
        }
    },

    // Mark entries as billed
    async markAsBilled(ids: string[]): Promise<void> {
        const db = await getDb();
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
        await db.execute(
            `UPDATE time_entries SET is_billed = 1 WHERE id IN (${placeholders})`,
            ids
        );
    },

    // Mark entries as unbilled (reverse a billing mistake)
    async markAsUnbilled(ids: string[]): Promise<void> {
        const db = await getDb();
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
        await db.execute(
            `UPDATE time_entries SET is_billed = 0 WHERE id IN (${placeholders})`,
            ids
        );
    },

    // Delete
    async delete(id: string): Promise<boolean> {
        timeEntryLogger.info('delete called', { id });
        try {
            const db = await getDb();
            await db.execute('DELETE FROM time_entries WHERE id = $1', [id]);
            timeEntryLogger.info('delete successful', { id });
            return true;
        } catch (error) {
            timeEntryLogger.error('delete failed', error, { id });
            throw error;
        }
    },

    // Bulk delete
    async deleteMany(ids: string[]): Promise<void> {
        const db = await getDb();
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
        await db.execute(
            `DELETE FROM time_entries WHERE id IN (${placeholders})`,
            ids
        );
    },
};

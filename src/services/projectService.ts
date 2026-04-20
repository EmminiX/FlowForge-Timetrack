// Project CRUD service

import { getDb } from '../lib/db';
import { projectLogger } from '../lib/logger';
import type { Project, ProjectWithStats, CreateProjectInput, UpdateProjectInput } from '../types';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export const projectService = {
  // Get all projects
  async getAll(): Promise<Project[]> {
    projectLogger.debug('getAll called');
    try {
      const db = await getDb();
      const result = await db.select<Project[]>(`
        SELECT 
          id, 
          client_id as clientId,
          name, 
          description, 
          status, 
          color,
          created_at as createdAt,
          updated_at as updatedAt
        FROM projects
        ORDER BY name ASC
      `);
      projectLogger.info('getAll completed', { count: result.length });
      return result;
    } catch (error) {
      projectLogger.error('getAll failed', error);
      throw error;
    }
  },

  // Get all projects with stats
  async getAllWithStats(): Promise<ProjectWithStats[]> {
    projectLogger.debug('getAllWithStats called');
    try {
      const db = await getDb();
      const result = await db.select<ProjectWithStats[]>(`
        SELECT 
          p.id, 
          p.client_id as clientId,
          p.name, 
          p.description, 
          p.status, 
          p.color,
          p.created_at as createdAt,
          p.updated_at as updatedAt,
          c.name as clientName,
          COALESCE(SUM(
            CASE WHEN te.end_time IS NOT NULL 
            THEN (julianday(te.end_time) - julianday(te.start_time)) * 86400 - te.pause_duration
            ELSE 0 END
          ), 0) / 3600.0 as totalHours,
          COALESCE(SUM(
            CASE WHEN te.end_time IS NOT NULL AND te.is_billable = 1
            THEN ((julianday(te.end_time) - julianday(te.start_time)) * 86400 - te.pause_duration) / 3600.0 * COALESCE(c.hourly_rate, 0)
            ELSE 0 END
          ), 0) as totalBillable
        FROM projects p
        LEFT JOIN clients c ON c.id = p.client_id
        LEFT JOIN time_entries te ON te.project_id = p.id
        GROUP BY p.id
        ORDER BY p.name ASC
      `);
      projectLogger.info('getAllWithStats completed', { count: result.length });
      return result;
    } catch (error) {
      projectLogger.error('getAllWithStats failed', error);
      throw error;
    }
  },

  // Get projects by client ID
  async getByClientId(clientId: string): Promise<Project[]> {
    projectLogger.debug('getByClientId called', { clientId });
    try {
      const db = await getDb();
      const result = await db.select<Project[]>(
        `
        SELECT 
          id, 
          client_id as clientId,
          name, 
          description, 
          status, 
          color,
          created_at as createdAt,
          updated_at as updatedAt
        FROM projects
        WHERE client_id = $1
        ORDER BY name ASC
      `,
        [clientId],
      );
      projectLogger.info('getByClientId completed', { clientId, count: result.length });
      return result;
    } catch (error) {
      projectLogger.error('getByClientId failed', error, { clientId });
      throw error;
    }
  },

  // Get active projects only (for timer dropdown)
  async getActive(): Promise<Project[]> {
    projectLogger.debug('getActive called');
    try {
      const db = await getDb();
      const result = await db.select<Project[]>(`
        SELECT 
          id, 
          client_id as clientId,
          name, 
          description, 
          status, 
          color,
          created_at as createdAt,
          updated_at as updatedAt
        FROM projects
        WHERE status = 'active'
        ORDER BY name ASC
      `);
      projectLogger.info('getActive completed', { count: result.length });
      return result;
    } catch (error) {
      projectLogger.error('getActive failed', error);
      throw error;
    }
  },

  // Get project by ID
  async getById(id: string): Promise<Project | null> {
    projectLogger.debug('getById called', { id });
    try {
      const db = await getDb();
      const result = await db.select<Project[]>(
        `
        SELECT 
          id, 
          client_id as clientId,
          name, 
          description, 
          status, 
          color,
          created_at as createdAt,
          updated_at as updatedAt
        FROM projects
        WHERE id = $1
      `,
        [id],
      );
      const project = result[0] || null;
      projectLogger.info('getById completed', { id, found: !!project });
      return project;
    } catch (error) {
      projectLogger.error('getById failed', error, { id });
      throw error;
    }
  },

  // Create a new project
  async create(input: CreateProjectInput): Promise<Project> {
    projectLogger.info('create called', { input });
    try {
      const db = await getDb();
      projectLogger.debug('Got database connection');
      const id = generateId();
      const timestamp = now();

      projectLogger.debug('Executing INSERT', { id, name: input.name });
      await db.execute(
        `
      INSERT INTO projects (id, client_id, name, description, status, color, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
        [
          id,
          input.clientId || null,
          input.name,
          input.description || '',
          input.status || 'active',
          input.color || '#007AFF',
          timestamp,
          timestamp,
        ],
      );
      projectLogger.info('create successful', { id, name: input.name });

      return {
        id,
        clientId: input.clientId || null,
        name: input.name,
        description: input.description || '',
        status: input.status || 'active',
        color: input.color || '#007AFF',
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    } catch (error) {
      projectLogger.error('create failed', error, { input });
      throw error;
    }
  },

  // Update a project
  async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
    projectLogger.info('update called', { id, input });
    try {
      const db = await getDb();
      const existing = await this.getById(id);
      if (!existing) {
        projectLogger.warn('update: project not found', { id });
        return null;
      }

      const updated = {
        ...existing,
        ...input,
        updatedAt: now(),
      };

      await db.execute(
        `
        UPDATE projects SET
          client_id = $1,
          name = $2,
          description = $3,
          status = $4,
          color = $5,
          updated_at = $6
        WHERE id = $7
      `,
        [
          updated.clientId,
          updated.name,
          updated.description,
          updated.status,
          updated.color,
          updated.updatedAt,
          id,
        ],
      );

      projectLogger.info('update successful', { id });
      return updated;
    } catch (error) {
      projectLogger.error('update failed', error, { id, input });
      throw error;
    }
  },

  // Delete a project
  async delete(id: string): Promise<boolean> {
    projectLogger.info('delete called', { id });
    try {
      const db = await getDb();
      await db.execute('DELETE FROM projects WHERE id = $1', [id]);
      projectLogger.info('delete successful', { id });
      return true;
    } catch (error) {
      projectLogger.error('delete failed', error, { id });
      throw error;
    }
  },
};

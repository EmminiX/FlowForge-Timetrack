import Database from '@tauri-apps/plugin-sql';
import { dbLogger } from './logger';

let dbInstance: Database | null = null;

export const getDb = async (): Promise<Database> => {
  if (dbInstance) {
    dbLogger.debug('Returning existing database instance');
    return dbInstance;
  }

  try {
    dbLogger.info('Initializing database connection to flowforge.db');
    // We use 'flowforge.db' as the database file name.
    // It will be stored in the App Data directory managed by Tauri.
    dbInstance = await Database.load('sqlite:flowforge.db');
    dbLogger.info('Database connection established successfully');
    return dbInstance;
  } catch (error) {
    dbLogger.error('Failed to initialize database connection', error);
    throw error;
  }
};

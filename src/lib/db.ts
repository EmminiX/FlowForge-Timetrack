import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;

export const getDb = async (): Promise<Database> => {
  if (dbInstance) {
    return dbInstance;
  }
  // We use 'flowforge.db' as the database file name.
  // It will be stored in the App Data directory managed by Tauri.
  dbInstance = await Database.load('sqlite:flowforge.db');
  return dbInstance;
};

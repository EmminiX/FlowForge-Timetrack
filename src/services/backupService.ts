// Backup and restore service for database management
// Exports and imports the flowforge.db SQLite database file

import { save, open } from '@tauri-apps/plugin-dialog';
import { copyFile, exists, BaseDirectory } from '@tauri-apps/plugin-fs';
import Database from '@tauri-apps/plugin-sql';
// import { appDataDir, join } from '@tauri-apps/api/path'; // Unused

const DB_FILENAME = 'flowforge.db';

export const backupService = {
  /**
   * Export the database to a user-selected location
   * Returns the path where the backup was saved, or null if cancelled
   */
  async exportBackup(): Promise<string | null> {
    try {
      // Check if database exists
      const dbExists = await exists(DB_FILENAME, { baseDir: BaseDirectory.AppData });
      if (!dbExists) {
        throw new Error('Database file not found');
      }

      // Open save dialog
      const savePath = await save({
        title: 'Export FlowForge Backup',
        defaultPath: `flowforge-backup-${new Date().toISOString().split('T')[0]}.db`,
        filters: [
          {
            name: 'SQLite Database',
            extensions: ['db'],
          },
        ],
      });

      if (!savePath) {
        return null; // User cancelled
      }

      // Force SQLite to write all WAL data to the main database file
      // usage of sqlite: prefix is required for load
      try {
        const db = await Database.load(`sqlite:${DB_FILENAME}`);
        await db.execute('PRAGMA wal_checkpoint(TRUNCATE);');
        // Optional: VACUUM to minimize size, but checkpoint is enough for consistency
        console.log('WAL Checkpoint complete');
      } catch (dbError) {
        console.warn('Failed to checkpoint WAL, backup might be stale:', dbError);
        // Continue anyway as we want to try to backup what we can
      }

      // Copy the database file using BaseDirectory option for reliable path resolution
      await copyFile(DB_FILENAME, savePath, { fromPathBaseDir: BaseDirectory.AppData });

      return savePath;
      return savePath;
    } catch (error: unknown) {
      console.error('Backup export failed:', error);
      // Ensure we throw a proper Error object with a message
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(message || 'Unknown error during backup export');
    }
  },

  /**
   * Import a backup file to replace the current database
   * Returns true if successful, false if cancelled
   * NOTE: App should be restarted after import for changes to take effect
   */
  async importBackup(): Promise<boolean> {
    console.log('backupService: importBackup started');
    try {
      console.log('backupService: Opening file dialog...');
      // Open file dialog
      const selectedPath = await open({
        title: 'Import FlowForge Backup',
        multiple: false,
        filters: [
          {
            name: 'SQLite Database',
            extensions: ['db'],
          },
        ],
      });
      console.log('backupService: Dialog closed. Path:', selectedPath);

      if (!selectedPath) {
        return false; // User cancelled
      }

      const filePath = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath;

      // Create backup of current database first using BaseDirectory
      const currentExists = await exists(DB_FILENAME, { baseDir: BaseDirectory.AppData });
      if (currentExists) {
        await copyFile(DB_FILENAME, `${DB_FILENAME}.backup`, {
          fromPathBaseDir: BaseDirectory.AppData,
          toPathBaseDir: BaseDirectory.AppData,
        });
      }

      try {
        // Remove existing database files to prevent WAL/SHM conflicts
        const filesToDelete = [DB_FILENAME, `${DB_FILENAME}-wal`, `${DB_FILENAME}-shm`];
        for (const file of filesToDelete) {
          const fileExists = await exists(file, { baseDir: BaseDirectory.AppData });
          if (fileExists) {
            try {
              // Import remove from correct plugin
              const { remove } = await import('@tauri-apps/plugin-fs');
              await remove(file, { baseDir: BaseDirectory.AppData });
              console.log(`Deleted existing ${file}`);
            } catch (e) {
              console.warn(`Failed to delete ${file} (might be in use or not exist):`, e);
            }
          }
        }

        // Copy imported file to database location
        await copyFile(filePath, DB_FILENAME, { toPathBaseDir: BaseDirectory.AppData });
        return true;
      } catch (copyError) {
        // Restore backup if copy failed
        if (currentExists) {
          await copyFile(`${DB_FILENAME}.backup`, DB_FILENAME, {
            fromPathBaseDir: BaseDirectory.AppData,
            toPathBaseDir: BaseDirectory.AppData,
          });
        }
        throw copyError;
      }
    } catch (error: unknown) {
      console.error('Backup import failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(message || 'Unknown error during backup import');
    }
  },
};

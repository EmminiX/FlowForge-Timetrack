// Settings service - persists app settings to database

import { getDb } from '../lib/db';
import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

export const settingsService = {
    // Load all settings from database
    async load(): Promise<AppSettings> {
        const db = await getDb();
        const rows = await db.select<{ key: string; value: string }[]>(
            'SELECT key, value FROM settings'
        );

        const settings = { ...DEFAULT_SETTINGS };

        for (const row of rows) {
            try {
                const value = JSON.parse(row.value);
                if (row.key in settings) {
                    (settings as Record<string, unknown>)[row.key] = value;
                }
            } catch (e) {
                console.error(`Failed to parse setting ${row.key}:`, e);
            }
        }

        return settings;
    },

    // Save a single setting
    async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
        const db = await getDb();
        const jsonValue = JSON.stringify(value);

        await db.execute(`
      INSERT INTO settings (key, value) VALUES ($1, $2)
      ON CONFLICT(key) DO UPDATE SET value = $2
    `, [key, jsonValue]);
    },

    // Save multiple settings at once
    async setMany(settings: Partial<AppSettings>): Promise<void> {
        for (const [key, value] of Object.entries(settings)) {
            await this.set(key as keyof AppSettings, value);
        }
    },

    // Get a single setting
    async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
        const db = await getDb();
        const rows = await db.select<{ value: string }[]>(
            'SELECT value FROM settings WHERE key = $1',
            [key]
        );

        if (rows[0]) {
            try {
                return JSON.parse(rows[0].value);
            } catch {
                return DEFAULT_SETTINGS[key];
            }
        }

        return DEFAULT_SETTINGS[key];
    },

    // Reset all settings to defaults
    async reset(): Promise<void> {
        const db = await getDb();
        await db.execute('DELETE FROM settings');
    },
};

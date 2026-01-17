/**
 * Debug Logger for FlowForge
 * 
 * A centralized logging system to track operations, errors, and debug info
 * across the entire application. Logs are stored in memory and can be viewed
 * in the debug panel.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    id: string;
    timestamp: Date;
    level: LogLevel;
    category: string;
    message: string;
    data?: unknown;
    error?: Error;
    stack?: string;
}

interface LoggerConfig {
    maxEntries: number;
    enableConsole: boolean;
    minLevel: LogLevel;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

class Logger {
    private entries: LogEntry[] = [];
    private listeners: Set<(entries: LogEntry[]) => void> = new Set();
    private config: LoggerConfig = {
        maxEntries: 500,
        enableConsole: true,
        minLevel: 'debug',
    };

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
    }

    private addEntry(entry: LogEntry): void {
        this.entries.push(entry);

        // Trim entries if exceeding max
        if (this.entries.length > this.config.maxEntries) {
            this.entries = this.entries.slice(-this.config.maxEntries);
        }

        // Notify listeners
        this.listeners.forEach(listener => listener([...this.entries]));

        // Console output
        if (this.config.enableConsole) {
            const prefix = `[${entry.category}]`;
            const consoleMethod = entry.level === 'error' ? 'error'
                : entry.level === 'warn' ? 'warn'
                    : entry.level === 'debug' ? 'debug'
                        : 'log';

            if (entry.data !== undefined) {
                console[consoleMethod](prefix, entry.message, entry.data);
            } else {
                console[consoleMethod](prefix, entry.message);
            }

            if (entry.error) {
                console.error(entry.error);
            }
        }
    }

    private log(level: LogLevel, category: string, message: string, data?: unknown, error?: Error): void {
        if (!this.shouldLog(level)) return;

        const entry: LogEntry = {
            id: this.generateId(),
            timestamp: new Date(),
            level,
            category,
            message,
            data,
            error,
            stack: error?.stack,
        };

        this.addEntry(entry);
    }

    // Public logging methods
    debug(category: string, message: string, data?: unknown): void {
        this.log('debug', category, message, data);
    }

    info(category: string, message: string, data?: unknown): void {
        this.log('info', category, message, data);
    }

    warn(category: string, message: string, data?: unknown): void {
        this.log('warn', category, message, data);
    }

    error(category: string, message: string, error?: Error | unknown, data?: unknown): void {
        const errorObj = error instanceof Error ? error : undefined;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log('error', category, `${message}: ${errorMessage}`, data, errorObj);
    }

    // Get all entries
    getEntries(): LogEntry[] {
        return [...this.entries];
    }

    // Get entries filtered by level
    getEntriesByLevel(level: LogLevel): LogEntry[] {
        return this.entries.filter(e => e.level === level);
    }

    // Get entries filtered by category
    getEntriesByCategory(category: string): LogEntry[] {
        return this.entries.filter(e => e.category === category);
    }

    // Get recent errors
    getRecentErrors(count = 10): LogEntry[] {
        return this.entries.filter(e => e.level === 'error').slice(-count);
    }

    // Clear all entries
    clear(): void {
        this.entries = [];
        this.listeners.forEach(listener => listener([]));
    }

    // Subscribe to log updates
    subscribe(listener: (entries: LogEntry[]) => void): () => void {
        this.listeners.add(listener);
        // Immediately send current entries
        listener([...this.entries]);
        // Return unsubscribe function
        return () => this.listeners.delete(listener);
    }

    // Update configuration
    configure(options: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...options };
    }

    // Export logs as JSON for debugging
    export(): string {
        return JSON.stringify(this.entries, (key, value) => {
            if (key === 'error' && value instanceof Error) {
                return {
                    name: value.name,
                    message: value.message,
                    stack: value.stack,
                };
            }
            return value;
        }, 2);
    }
}

// Singleton instance
export const logger = new Logger();

// Category-specific loggers for convenience
export const dbLogger = {
    debug: (msg: string, data?: unknown) => logger.debug('Database', msg, data),
    info: (msg: string, data?: unknown) => logger.info('Database', msg, data),
    warn: (msg: string, data?: unknown) => logger.warn('Database', msg, data),
    error: (msg: string, err?: Error | unknown, data?: unknown) => logger.error('Database', msg, err, data),
};

export const clientLogger = {
    debug: (msg: string, data?: unknown) => logger.debug('Client', msg, data),
    info: (msg: string, data?: unknown) => logger.info('Client', msg, data),
    warn: (msg: string, data?: unknown) => logger.warn('Client', msg, data),
    error: (msg: string, err?: Error | unknown, data?: unknown) => logger.error('Client', msg, err, data),
};

export const projectLogger = {
    debug: (msg: string, data?: unknown) => logger.debug('Project', msg, data),
    info: (msg: string, data?: unknown) => logger.info('Project', msg, data),
    warn: (msg: string, data?: unknown) => logger.warn('Project', msg, data),
    error: (msg: string, err?: Error | unknown, data?: unknown) => logger.error('Project', msg, err, data),
};

export const timeEntryLogger = {
    debug: (msg: string, data?: unknown) => logger.debug('TimeEntry', msg, data),
    info: (msg: string, data?: unknown) => logger.info('TimeEntry', msg, data),
    warn: (msg: string, data?: unknown) => logger.warn('TimeEntry', msg, data),
    error: (msg: string, err?: Error | unknown, data?: unknown) => logger.error('TimeEntry', msg, err, data),
};

export const invoiceLogger = {
    debug: (msg: string, data?: unknown) => logger.debug('Invoice', msg, data),
    info: (msg: string, data?: unknown) => logger.info('Invoice', msg, data),
    warn: (msg: string, data?: unknown) => logger.warn('Invoice', msg, data),
    error: (msg: string, err?: Error | unknown, data?: unknown) => logger.error('Invoice', msg, err, data),
};

export const uiLogger = {
    debug: (msg: string, data?: unknown) => logger.debug('UI', msg, data),
    info: (msg: string, data?: unknown) => logger.info('UI', msg, data),
    warn: (msg: string, data?: unknown) => logger.warn('UI', msg, data),
    error: (msg: string, err?: Error | unknown, data?: unknown) => logger.error('UI', msg, err, data),
};

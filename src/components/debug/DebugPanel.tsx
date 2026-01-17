import { useState, useEffect, useRef } from 'react';
import { Bug, X, Trash2, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { logger, type LogEntry, type LogLevel } from '../../lib/logger';

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
    debug: 'text-gray-400',
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
};

const LOG_LEVEL_BG: Record<LogLevel, string> = {
    debug: 'bg-gray-500/10',
    info: 'bg-blue-500/10',
    warn: 'bg-yellow-500/10',
    error: 'bg-red-500/10',
};

export function DebugPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [entries, setEntries] = useState<LogEntry[]>([]);
    const [filter, setFilter] = useState<LogLevel | 'all'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = logger.subscribe((newEntries) => {
            setEntries(newEntries);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (logEndRef.current && isOpen && !isMinimized) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [entries, isOpen, isMinimized]);

    // Get unique categories
    const categories = ['all', ...new Set(entries.map((e) => e.category))];

    // Filter entries
    const filteredEntries = entries.filter((entry) => {
        if (filter !== 'all' && entry.level !== filter) return false;
        if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;
        return true;
    });

    const errorCount = entries.filter((e) => e.level === 'error').length;
    const warnCount = entries.filter((e) => e.level === 'warn').length;

    const handleExport = () => {
        const data = logger.export();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flowforge-logs-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3,
        });
    };

    // Floating trigger button
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg shadow-lg hover:bg-surface-hover transition-colors"
                title="Open Debug Panel"
            >
                <Bug className="w-4 h-4" />
                {errorCount > 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                        {errorCount}
                    </span>
                )}
                {warnCount > 0 && errorCount === 0 && (
                    <span className="px-1.5 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
                        {warnCount}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div
            className={`fixed bottom-4 right-4 z-50 bg-surface border border-border rounded-lg shadow-xl transition-all ${isMinimized ? 'w-80' : 'w-[600px]'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-hover rounded-t-lg">
                <div className="flex items-center gap-2">
                    <Bug className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Debug Log</span>
                    <span className="text-xs text-muted-foreground">
                        ({filteredEntries.length} / {entries.length})
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleExport}
                        className="p-1 hover:bg-background rounded"
                        title="Export logs"
                    >
                        <Download className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                        onClick={() => logger.clear()}
                        className="p-1 hover:bg-background rounded"
                        title="Clear logs"
                    >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1 hover:bg-background rounded"
                        title={isMinimized ? 'Expand' : 'Minimize'}
                    >
                        {isMinimized ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-background rounded"
                        title="Close"
                    >
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Filters */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as LogLevel | 'all')}
                            className="text-xs px-2 py-1 bg-surface border border-border rounded"
                        >
                            <option value="all">All Levels</option>
                            <option value="debug">Debug</option>
                            <option value="info">Info</option>
                            <option value="warn">Warning</option>
                            <option value="error">Error</option>
                        </select>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="text-xs px-2 py-1 bg-surface border border-border rounded"
                        >
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat === 'all' ? 'All Categories' : cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Log entries */}
                    <div className="h-64 overflow-y-auto font-mono text-xs">
                        {filteredEntries.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No log entries
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {filteredEntries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className={`px-3 py-2 ${LOG_LEVEL_BG[entry.level]}`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="text-muted-foreground whitespace-nowrap">
                                                {formatTime(entry.timestamp)}
                                            </span>
                                            <span
                                                className={`uppercase font-bold w-12 ${LOG_LEVEL_COLORS[entry.level]}`}
                                            >
                                                {entry.level}
                                            </span>
                                            <span className="text-primary font-medium">
                                                [{entry.category}]
                                            </span>
                                            <span className="text-foreground flex-1 break-all">
                                                {entry.message}
                                            </span>
                                        </div>
                                        {entry.data && (
                                            <pre className="mt-1 ml-[88px] text-muted-foreground overflow-x-auto">
                                                {JSON.stringify(entry.data, null, 2)}
                                            </pre>
                                        )}
                                        {entry.stack && (
                                            <pre className="mt-1 ml-[88px] text-red-300 text-[10px] overflow-x-auto whitespace-pre-wrap">
                                                {entry.stack}
                                            </pre>
                                        )}
                                    </div>
                                ))}
                                <div ref={logEndRef} />
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

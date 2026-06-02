import { useState, useEffect, useId, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  Download,
  FileText,
  FolderKanban,
  Play,
  Search,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  useGlobalSearch,
  type CommandCenterItem,
  type CommandAction,
} from '../../hooks/useGlobalSearch';
import { useTimerWithEffects } from '../../hooks/useTimerWithEffects';
import { executeCommandCenterItem } from '../../services/commandActionService';
import { invoiceService } from '../../services';
import { uiLogger } from '../../lib/logger';

const TYPE_ICONS: Record<string, LucideIcon> = {
  client: Users,
  project: FolderKanban,
  invoice: FileText,
  'time-entry': FileText,
};

const ACTION_ICONS: Record<CommandAction, LucideIcon> = {
  'start-timer': Play,
  'create-invoice': FileText,
  'add-client': UserPlus,
  'mark-paid': CheckCircle,
  'export-pdf': Download,
  'quick-add-time': Clock,
};

export function Header() {
  const navigate = useNavigate();
  const { query, setQuery, isOpen, open, close, results } = useGlobalSearch();
  const { start: startTimer } = useTimerWithEffects();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputId = useId();
  const searchResultsId = useId();
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasSearchOpenRef = useRef(false);
  const activeResultId = results[selectedIndex] ? `${searchResultsId}-${selectedIndex}` : undefined;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    // Use timeout to avoid synchronous setState in effect
    const timer = setTimeout(() => setSelectedIndex(0), 0);
    return () => clearTimeout(timer);
  }, [results]);

  useEffect(() => {
    if (!isOpen) return;

    const handleDialogKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }

      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length === 0) return;

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);
    return () => document.removeEventListener('keydown', handleDialogKeyDown);
  }, [close, isOpen]);

  useEffect(() => {
    if (wasSearchOpenRef.current && !isOpen) {
      searchButtonRef.current?.focus();
    }
    wasSearchOpenRef.current = isOpen;
  }, [isOpen]);

  const handleSelect = async (result: CommandCenterItem) => {
    try {
      await executeCommandCenterItem(result, {
        navigate,
        startTimer,
        markInvoicePaid: async (invoiceId) => {
          await invoiceService.update(invoiceId, { status: 'paid' });
        },
        exportInvoicePdf: async (invoiceId) => {
          const { exportInvoicePdfById } = await import('../../services/invoicePdfService');
          await exportInvoicePdfById(invoiceId);
        },
      });
      close();
    } catch (error) {
      uiLogger.error('Command center action failed', error);
    }
  };

  const getResultIcon = (result: CommandCenterItem) => {
    if (result.kind === 'action') {
      return ACTION_ICONS[result.action] || FileText;
    }

    return TYPE_ICONS[result.type] || FileText;
  };

  const getResultLabel = (result: CommandCenterItem) => {
    if (result.kind === 'action') return 'Action';
    return result.type.replace('-', ' ');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      void handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      close();
    }
  };

  return (
    <header
      className='h-16 border-b border-border flex items-center gap-4 bg-[var(--surface)] shrink-0'
      style={{ paddingInline: 'var(--shell-header-px)' }}
    >
      <div className='flex items-center gap-3 min-w-0'>
        <div className='grid h-9 w-9 place-items-center rounded-md border border-primary/35 bg-primary/10 text-sm font-bold text-primary'>
          TS
        </div>
        <h1 className='text-xl font-semibold text-foreground'>TimeSage</h1>
      </div>

      <div className='ml-auto relative'>
        <button
          ref={searchButtonRef}
          onClick={open}
          className='flex min-h-11 items-center gap-2 rounded-md border border-border bg-[var(--surface-raised)] px-3 py-1.5 text-sm text-muted-foreground shadow-[var(--shadow-subtle)] transition-colors hover:border-primary/40 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
          aria-label='Open command center'
        >
          <Search className='w-4 h-4' />
          <span>Command</span>
          <kbd className='ml-2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground'>
            {/Mac/.test(navigator.userAgent) ? '⌘' : 'Ctrl'}+K
          </kbd>
        </button>

        {isOpen && (
          <>
            <div
              className='fixed inset-0 bg-black/55 z-40 backdrop-blur-sm animate-in fade-in duration-150'
              onClick={close}
            />
            <div className='fixed top-[20vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2'>
              <div
                ref={dialogRef}
                role='dialog'
                aria-modal='true'
                aria-label='Command center'
                className='overflow-hidden rounded-lg border border-border bg-[var(--surface-raised)] shadow-[var(--shadow-modal)] animate-in fade-in zoom-in-95 duration-150'
              >
                <div className='flex items-center gap-3 px-4 py-3 border-b border-border'>
                  <Search className='w-5 h-5 text-muted-foreground shrink-0' />
                  <input
                    id={searchInputId}
                    type='search'
                    role='searchbox'
                    aria-label='Command'
                    aria-controls={searchResultsId}
                    aria-expanded={isOpen}
                    aria-activedescendant={activeResultId}
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Search or run an action...'
                    className='flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground'
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className='grid min-h-11 min-w-11 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
                      aria-label='Clear search'
                    >
                      <X className='w-4 h-4' />
                    </button>
                  )}
                </div>

                <div
                  id={searchResultsId}
                  role='listbox'
                  aria-label='Command center results'
                  className='max-h-64 overflow-y-auto'
                >
                  {query.trim() && (
                    <>
                      {results.length === 0 ? (
                        <div className='px-4 py-8 text-center text-sm text-muted-foreground'>
                          No results found
                        </div>
                      ) : (
                        results.map((result, index) => {
                          const Icon = getResultIcon(result);
                          return (
                            <button
                              key={result.id}
                              id={`${searchResultsId}-${index}`}
                              role='option'
                              aria-selected={index === selectedIndex}
                              onClick={() => void handleSelect(result)}
                              className={`w-full flex min-h-11 items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring ${
                                index === selectedIndex ? 'bg-muted' : ''
                              }`}
                            >
                              <Icon className='w-4 h-4 text-muted-foreground shrink-0' />
                              <div className='flex-1 min-w-0'>
                                <p className='text-sm font-medium truncate'>{result.title}</p>
                                {result.subtitle && (
                                  <p className='text-xs text-muted-foreground truncate'>
                                    {result.subtitle}
                                  </p>
                                )}
                              </div>
                              <span className='text-xs text-muted-foreground capitalize shrink-0'>
                                {getResultLabel(result)}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </>
                  )}
                </div>

                <div className='flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-4 py-2 text-xs text-muted-foreground'>
                  <span>
                    <kbd className='rounded bg-muted px-1'>↑↓</kbd> Navigate
                  </span>
                  <span>
                    <kbd className='rounded bg-muted px-1'>↵</kbd> Select
                  </span>
                  <span>
                    <kbd className='rounded bg-muted px-1'>Esc</kbd> Close
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

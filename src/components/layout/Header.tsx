import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Users, FolderKanban, FileText, X } from 'lucide-react';
import { useGlobalSearch, type SearchResult } from '../../hooks/useGlobalSearch';

const TYPE_ICONS: Record<string, typeof Users> = {
  client: Users,
  project: FolderKanban,
  invoice: FileText,
  'time-entry': FileText,
};

// Route to title mapping
const ROUTE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Timer', subtitle: 'Track your time' },
  '/clients': { title: 'Clients', subtitle: 'Manage your clients' },
  '/projects': { title: 'Projects', subtitle: 'Organize your work' },
  '/time-entries': { title: 'Time Entries', subtitle: 'View your tracked time' },
  '/invoices': { title: 'Invoices', subtitle: 'Create and manage invoices' },
  '/products': { title: 'Products', subtitle: 'Service catalog' },
  '/settings': { title: 'Settings', subtitle: 'Configure your preferences' },
};

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { query, setQuery, isOpen, open, close, results } = useGlobalSearch();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Get current page title based on route
  const pageInfo = ROUTE_TITLES[location.pathname] || { title: 'TimeSage' };

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
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.route);
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      close();
    }
  };

  return (
    <header className='h-16 border-b border-border flex items-center bg-background shrink-0' style={{ paddingInline: 'var(--shell-header-px)' }}>
      <div>
        <h1 className='text-xl font-semibold'>{pageInfo.title}</h1>
        {pageInfo.subtitle && <p className='text-sm text-muted-foreground'>{pageInfo.subtitle}</p>}
      </div>

      <div className='ml-auto relative'>
        <button
          onClick={open}
          className='flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors'
        >
          <Search className='w-4 h-4' />
          <span>Search...</span>
          <kbd className='ml-2 px-1.5 py-0.5 text-xs font-mono bg-background border border-border rounded'>
            {/Mac/.test(navigator.userAgent) ? '⌘' : 'Ctrl'}+K
          </kbd>
        </button>

        {isOpen && (
          <>
            <div className='fixed inset-0 bg-background/60 backdrop-blur-sm z-40' onClick={close} />
            <div className='fixed top-[20vh] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4 sm:px-0'>
              <div className='bg-background border border-border/60 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95'>
                <div className='flex items-center gap-3 px-4 py-3 border-b border-border'>
                  <Search className='w-5 h-5 text-muted-foreground shrink-0' />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Search clients, projects, invoices...'
                    aria-label='Search'
                    aria-autocomplete='list'
                    aria-controls='cmd-search-results'
                    className='flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground'
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      aria-label='Clear search'
                      className='text-muted-foreground hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    >
                      <X className='w-4 h-4' />
                    </button>
                  )}
                </div>

                {query.trim() && (
                  <div
                    id='cmd-search-results'
                    role='listbox'
                    aria-label='Search results'
                    className='max-h-64 overflow-y-auto'
                  >
                    {results.length === 0 ? (
                      <div className='px-4 py-8 text-center text-sm text-muted-foreground'>
                        No results found
                      </div>
                    ) : (
                      results.map((result, index) => {
                        const Icon = TYPE_ICONS[result.type] || FileText;
                        const isSelected = index === selectedIndex;
                        return (
                          <button
                            key={result.id}
                            role='option'
                            aria-selected={isSelected}
                            onClick={() => handleSelect(result)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-l-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                              isSelected
                                ? 'bg-secondary border-l-primary'
                                : 'border-l-transparent hover:bg-secondary/60'
                            }`}
                          >
                            <Icon className='w-4 h-4 text-muted-foreground shrink-0' />
                            <div className='flex-1 min-w-0'>
                              <p className='text-sm font-medium truncate'>{result.title}</p>
                              {result.subtitle && (
                                <p className='text-xs text-muted-foreground truncate'>{result.subtitle}</p>
                              )}
                            </div>
                            <span className='text-xs text-muted-foreground capitalize shrink-0'>
                              {result.type.replace('-', ' ')}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                <div className='px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground'>
                  <span><kbd className='px-1 bg-secondary rounded'>↑↓</kbd> Navigate</span>
                  <span><kbd className='px-1 bg-secondary rounded'>↵</kbd> Select</span>
                  <span><kbd className='px-1 bg-secondary rounded'>Esc</kbd> Close</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

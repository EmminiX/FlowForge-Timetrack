import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, FolderKanban, FileText, X } from 'lucide-react';
import { useGlobalSearch, type SearchResult } from '../../hooks/useGlobalSearch';

const TYPE_ICONS: Record<string, typeof Users> = {
  client: Users,
  project: FolderKanban,
  invoice: FileText,
  'time-entry': FileText,
};

export function Header() {
  const navigate = useNavigate();
  const { query, setQuery, isOpen, open, close, results } = useGlobalSearch();
  const [selectedIndex, setSelectedIndex] = useState(0);

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
    <header className='h-16 border-b border-border flex items-center px-8 bg-background shrink-0'>
      <h1 className='text-xl font-semibold'>FlowForge-Track</h1>

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
            <div className='fixed inset-0 bg-black/50 z-40' onClick={close} />
            <div className='fixed top-[20vh] left-1/2 -translate-x-1/2 w-full max-w-lg z-50'>
              <div className='bg-background border border-border rounded-xl shadow-xl overflow-hidden'>
                <div className='flex items-center gap-3 px-4 py-3 border-b border-border'>
                  <Search className='w-5 h-5 text-muted-foreground shrink-0' />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Search clients, projects, invoices...'
                    className='flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground'
                  />
                  {query && (
                    <button onClick={() => setQuery('')} className='text-muted-foreground hover:text-foreground'>
                      <X className='w-4 h-4' />
                    </button>
                  )}
                </div>

                {query.trim() && (
                  <div className='max-h-64 overflow-y-auto'>
                    {results.length === 0 ? (
                      <div className='px-4 py-8 text-center text-sm text-muted-foreground'>
                        No results found
                      </div>
                    ) : (
                      results.map((result, index) => {
                        const Icon = TYPE_ICONS[result.type] || FileText;
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleSelect(result)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary transition-colors ${
                              index === selectedIndex ? 'bg-secondary' : ''
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

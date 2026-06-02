import { NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, List } from 'lucide-react';
import { CalendarTimeView, TimeEntriesList } from '../features/time-entries';

const viewLinks = [
  { to: '/time-entries', label: 'List', icon: List, end: true },
  { to: '/time-entries/calendar', label: 'Calendar', icon: CalendarDays, end: true },
];

export function TimeEntries() {
  const location = useLocation();
  const isCalendar = location.pathname.endsWith('/calendar');

  return (
    <div className='space-y-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex rounded-md border border-border bg-[var(--surface-raised)] p-1'>
          {viewLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex min-h-9 items-center gap-2 rounded px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <link.icon className='h-4 w-4' />
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>

      {isCalendar ? <CalendarTimeView /> : <TimeEntriesList />}
    </div>
  );
}

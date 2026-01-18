import { NavLink } from 'react-router-dom';
import { Timer, Users, Briefcase, Clock, FileText, Settings } from 'lucide-react';
import clsx from 'clsx';

export function Sidebar() {
  const mainLinks = [
    { to: '/', label: 'Timer', icon: Timer },
    { to: '/clients', label: 'Clients', icon: Users },
    { to: '/projects', label: 'Projects', icon: Briefcase },
    { to: '/time-entries', label: 'Time Entries', icon: Clock },
    { to: '/invoices', label: 'Invoices', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-secondary border-r border-border h-screen flex flex-col p-4 shrink-0">
      <div className="text-2xl font-bold mb-8 px-4 text-primary">FlowForge</div>

      <nav className="flex-1 space-y-1">
        {mainLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-base hover-scale',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted-foreground/10'
              )
            }
          >
            <link.icon className="w-5 h-5" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="pt-4 border-t border-border">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-base hover-scale',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted-foreground/10'
            )
          }
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}

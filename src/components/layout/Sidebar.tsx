import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, Settings } from 'lucide-react';
import clsx from 'clsx';

export function Sidebar() {
  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/clients', label: 'Clients', icon: Users },
    { to: '/projects', label: 'Projects', icon: Briefcase },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-secondary border-r border-border h-screen flex flex-col p-4 shrink-0">
      <div className="text-2xl font-bold mb-8 px-4 text-primary">FlowForge</div>
      <nav className="flex-1 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-lg',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted-foreground/10'
              )
            }
          >
            <link.icon className="w-6 h-6" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

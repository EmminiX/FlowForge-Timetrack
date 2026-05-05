import { NavLink } from 'react-router-dom';
import {
  Timer,
  Users,
  Briefcase,
  Clock,
  FileText,
  Settings,
  Volume2,
  VolumeX,
  Package,
} from 'lucide-react';
import clsx from 'clsx';
import { useSettings } from '../../contexts/SettingsContext';

import { Switch } from '../ui';

interface SidebarProps {
  topPadding?: string;
}

export function Sidebar({ topPadding = '0' }: SidebarProps) {
  const { settings, updateSetting } = useSettings();
  const mainLinks = [
    { to: '/', label: 'Timer', icon: Timer },
    { to: '/clients', label: 'Clients', icon: Users },
    { to: '/projects', label: 'Projects', icon: Briefcase },
    { to: '/time-entries', label: 'Time Entries', icon: Clock },
    { to: '/invoices', label: 'Invoices', icon: FileText },
    { to: '/products', label: 'Products', icon: Package },
  ];

  const navItemStyle = {
    paddingTop: 'var(--shell-nav-item-py)',
    paddingBottom: 'var(--shell-nav-item-py)',
    paddingInline: 'var(--shell-nav-item-px)',
  };

  return (
    <aside
      className='w-64 bg-secondary border-r border-border h-screen flex flex-col shrink-0'
      style={{
        padding: 'var(--shell-sidebar-padding)',
        ...(topPadding && topPadding !== '0' ? { paddingTop: `calc(${topPadding} + var(--shell-sidebar-padding))` } : {}),
      }}
    >
      <div
        className='text-2xl font-bold text-primary'
        style={{ marginBottom: 'var(--shell-brand-mb)', paddingInline: 'var(--shell-nav-item-px)' }}
      >
        TimeSage
      </div>

      <nav className='flex-1 flex flex-col' style={{ gap: 'var(--shell-section-gap)' }}>
        {mainLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            style={navItemStyle}
            className={({ isActive }) =>
              clsx(
                'relative flex items-center gap-3 rounded-lg transition-all text-base hover-scale focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:inset-y-2 before:w-0.5 before:rounded-r-full before:bg-primary'
                  : 'text-foreground hover:bg-muted-foreground/10',
              )
            }
          >
            <link.icon className='w-5 h-5' />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div
        className='border-t border-border flex flex-col'
        style={{ paddingTop: 'var(--shell-brand-mb)', gap: 'var(--shell-section-gap)' }}
      >
        <div
          className='flex items-center justify-between rounded-lg text-foreground hover:bg-muted-foreground/10 transition-colors'
          style={navItemStyle}
        >
          <div className='flex items-center gap-3'>
            {settings.enableSoundFeedback ? (
              <Volume2 className='w-5 h-5' />
            ) : (
              <VolumeX className='w-5 h-5 text-muted-foreground' />
            )}
            <span className={clsx(!settings.enableSoundFeedback && 'text-muted-foreground')}>
              Sound
            </span>
          </div>
          <Switch
            checked={settings.enableSoundFeedback}
            onCheckedChange={(checked) => updateSetting('enableSoundFeedback', checked)}
          />
        </div>
        <NavLink
          to='/settings'
          style={navItemStyle}
          className={({ isActive }) =>
            clsx(
              'relative flex items-center gap-3 rounded-lg transition-all text-base hover-scale focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              isActive
                ? 'bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:inset-y-2 before:w-0.5 before:rounded-r-full before:bg-primary'
                : 'text-foreground hover:bg-muted-foreground/10',
            )
          }
        >
          <Settings className='w-5 h-5' />
          <span>Settings</span>
        </NavLink>
        <div style={{ paddingTop: 'var(--shell-nav-item-py)', paddingBottom: 'var(--spacing-xs)', paddingInline: 'var(--shell-nav-item-px)' }}>
          <a
            href='https://flowforge.emmi.zone/'
            target='_blank'
            rel='noopener noreferrer'
            className='block text-xs text-muted-foreground hover:text-foreground transition-colors'
          >
            flowforge.emmi.zone
          </a>
          <a
            href='https://emmi.engineer'
            target='_blank'
            rel='noopener noreferrer'
            className='block text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-0.5'
          >
            by emmi.engineer
          </a>
        </div>
      </div>
    </aside>
  );
}

import { NavLink } from 'react-router-dom';
import type { CSSProperties } from 'react';
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

  const asideStyle: CSSProperties = {
    padding: 'var(--shell-sidebar-padding)',
    ...(topPadding && topPadding !== '0'
      ? { paddingTop: `calc(${topPadding} + var(--shell-sidebar-padding))` }
      : {}),
  };

  return (
    <aside
      className='flex h-screen w-64 shrink-0 flex-col border-r border-border bg-[var(--sidebar)]'
      style={asideStyle}
    >
      <div className='flex items-center gap-3' style={{ marginBottom: 'var(--shell-brand-mb)', paddingInline: 'var(--shell-nav-item-px)' }}>
        <div className='grid h-10 w-10 place-items-center rounded-md border border-primary/35 bg-primary/10 text-sm font-bold text-primary'>
          TS
        </div>
        <div className='min-w-0'>
          <div className='truncate text-xl font-bold text-foreground'>TimeSage</div>
          <div className='text-xs font-medium text-muted-foreground'>Private time ledger</div>
        </div>
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
                'flex min-h-11 items-center gap-3 rounded-md text-base transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-[var(--shadow-subtle)]'
                  : 'text-foreground hover:bg-muted',
              )
            }
          >
            <link.icon className='w-5 h-5' />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div
        className='border-t border-border flex flex-col'
        style={{ paddingTop: 'var(--shell-brand-mb)', gap: 'var(--shell-section-gap)' }}
      >
        <div
          className='flex min-h-11 items-center justify-between rounded-md text-foreground transition-colors hover:bg-muted'
          style={navItemStyle}
        >
          <div id='sound-feedback-label' className='flex items-center gap-3'>
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
            aria-labelledby='sound-feedback-label'
          />
        </div>
        <NavLink
          to='/settings'
          style={navItemStyle}
          className={({ isActive }) =>
            clsx(
              'flex min-h-11 items-center gap-3 rounded-md text-base transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
              isActive
                ? 'bg-primary text-primary-foreground shadow-[var(--shadow-subtle)]'
                : 'text-foreground hover:bg-muted',
            )
          }
        >
          <Settings className='w-5 h-5' />
          <span>Settings</span>
        </NavLink>
        <div style={{ paddingTop: 'var(--shell-nav-item-py)', paddingBottom: 'var(--spacing-xs)', paddingInline: 'var(--shell-nav-item-px)' }}>
          <a
            href='https://timesage.emmi.zone/'
            target='_blank'
            rel='noopener noreferrer'
            className='flex min-h-11 items-center rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
          >
            Product website
          </a>
          <a
            href='https://emmi.engineer'
            target='_blank'
            rel='noopener noreferrer'
            className='flex min-h-11 items-center rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
          >
            by emmi.engineer
          </a>
        </div>
      </div>
    </aside>
  );
}

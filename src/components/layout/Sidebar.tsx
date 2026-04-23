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

export function Sidebar() {
  const { settings, updateSetting } = useSettings();
  const mainLinks = [
    { to: '/', label: 'Timer', icon: Timer },
    { to: '/clients', label: 'Clients', icon: Users },
    { to: '/projects', label: 'Projects', icon: Briefcase },
    { to: '/time-entries', label: 'Time Entries', icon: Clock },
    { to: '/invoices', label: 'Invoices', icon: FileText },
    { to: '/products', label: 'Products', icon: Package },
  ];

  return (
    <aside className='w-64 bg-secondary border-r border-border h-screen flex flex-col p-4 shrink-0'>
      <div className='text-2xl font-bold mb-8 px-4 text-primary'>FlowForge-Track</div>

      <nav className='flex-1 space-y-1'>
        {mainLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              clsx(
                'relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-base hover-scale focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
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
      <div className='pt-4 border-t border-border space-y-1'>
        <div className='flex items-center justify-between px-4 py-3 rounded-lg text-foreground hover:bg-muted-foreground/10 transition-colors'>
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
          className={({ isActive }) =>
            clsx(
              'relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-base hover-scale focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              isActive
                ? 'bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:inset-y-2 before:w-0.5 before:rounded-r-full before:bg-primary'
                : 'text-foreground hover:bg-muted-foreground/10',
            )
          }
        >
          <Settings className='w-5 h-5' />
          <span>Settings</span>
        </NavLink>
        <div className='px-4 pt-3 pb-1'>
          <a href='https://flowforge.emmi.zone/' target='_blank' rel='noopener noreferrer'
             className='block text-xs text-muted-foreground hover:text-foreground transition-colors'>
            flowforge.emmi.zone
          </a>
          <a href='https://emmi.engineer' target='_blank' rel='noopener noreferrer'
             className='block text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-0.5'>
            by emmi.engineer
          </a>
        </div>
      </div>
    </aside>
  );
}

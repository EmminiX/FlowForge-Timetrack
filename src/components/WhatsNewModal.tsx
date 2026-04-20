// What's New modal — shown once per version on first launch after upgrade

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from './ui/Modal';
import { Button } from './ui/Button';
import { useSettings } from '../contexts/SettingsContext';
import { updateService } from '../services/updateService';

interface ChangelogSection {
  title: string;
  items: string[];
}

const CHANGELOG: Record<string, ChangelogSection[]> = {
  '0.2.0': [
    {
      title: 'New Features',
      items: [
        'Down Payment Support — Record deposits on invoices, subtracted from total on PDF and preview',
        'Dashboard Analytics — Daily, weekly, and monthly breakdowns with 30-day chart and per-client/project stats',
        'Product Catalog — Manage reusable products/services with descriptions, prices, and SKUs',
        'CSV Export — Export invoice data to CSV for spreadsheets and accounting tools',
        'Global Search — Quick-find clients, projects, and invoices from the header (Cmd+K / Ctrl+K)',
      ],
    },
    {
      title: 'Improvements',
      items: [
        'Lexend Font — Dyslexia-friendly font for improved readability',
        'Multi-Currency — Set currency per client (EUR, USD, GBP) with correct symbols throughout',
        'Multi-page PDF — Invoices with many line items now paginate correctly',
        'Keyboard Shortcuts Dialog — Press ? to see all available shortcuts',
      ],
    },
    {
      title: 'Reliability',
      items: [
        'Error Boundaries — Graceful error handling prevents full-app crashes',
        'Toast Undo System — Undo destructive actions like deleting entries',
        'Dark Mode Fixes — Improved consistency across all views',
        'Database Migration Fixes — Smoother upgrades between versions',
      ],
    },
    {
      title: 'Accessibility',
      items: [
        'High Contrast Theme — Improved visibility for low-vision users',
        'Disable Animations — Option to turn off UI animations for a calmer experience',
        'Full Keyboard Navigation — Navigate and control the app entirely with keyboard',
      ],
    },
  ],
};

export function WhatsNewModal() {
  const { settings, updateSetting, loading } = useSettings();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (loading) return;

    // Don't show on widget window
    if (window.location.pathname === '/widget') return;

    const currentVersion = updateService.getCurrentVersion();
    if (!currentVersion || currentVersion === '0.0.0') return;

    // Show if user hasn't seen this version's changelog
    if (settings.seenChangelogVersion !== currentVersion) {
      setIsOpen(true);
    }
  }, [loading, settings.seenChangelogVersion]);

  const handleDismiss = async () => {
    setIsOpen(false);
    const currentVersion = updateService.getCurrentVersion();
    await updateSetting('seenChangelogVersion', currentVersion);
  };

  const currentVersion = updateService.getCurrentVersion();
  const sections = CHANGELOG[currentVersion] || CHANGELOG['0.2.0'];

  if (!sections) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleDismiss} title={`What's New in v${currentVersion}`} size='lg'>
      <div className='space-y-5'>
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className='text-sm font-semibold text-primary mb-2'>{section.title}</h3>
            <ul className='space-y-1.5'>
              {section.items.map((item) => {
                const [label, ...rest] = item.split(' — ');
                const description = rest.join(' — ');
                return (
                  <li key={item} className='text-sm text-foreground/80 flex items-start gap-2'>
                    <span className='text-primary mt-0.5 shrink-0'>-</span>
                    <span>
                      {description ? (
                        <>
                          <span className='font-medium text-foreground'>{label}</span>
                          {' — '}
                          {description}
                        </>
                      ) : (
                        label
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <ModalFooter>
        <Button onClick={handleDismiss}>Got it!</Button>
      </ModalFooter>
    </Modal>
  );
}

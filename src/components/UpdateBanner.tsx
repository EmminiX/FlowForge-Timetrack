// UpdateBanner - shows when a new version is available

import { useState, useEffect } from 'react';
import { Download, X, Radio } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';

import { updateService, type UpdateCheckResult } from '../services/updateService';

export function UpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check for updates on mount (once per session)
    const checkUpdate = async () => {
      const result = await updateService.checkForUpdate();
      setUpdateInfo(result);
    };

    checkUpdate();
  }, []);

  // Don't render if no update or dismissed
  if (!updateInfo?.hasUpdate || dismissed) {
    return null;
  }

  const handleOpenRelease = async () => {
    try {
      await openUrl(updateInfo.releaseUrl);
    } catch {
      // Fallback for non-Tauri environments (dev mode in browser)
      window.open(updateInfo.releaseUrl, '_blank');
    }
  };

  return (
    <div className='border-b border-primary/30 bg-primary/10 px-4 py-3'>
      <div className='max-w-4xl mx-auto flex items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <div className='flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-primary/15'>
            <Radio className='w-4 h-4 text-primary' />
          </div>
          <div>
            <span className='text-sm font-semibold text-foreground'>
              TimeSage {updateInfo.latestVersion} is available.
            </span>
            <span className='text-xs text-muted-foreground ml-2'>
              (You have {updateInfo.currentVersion})
            </span>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={handleOpenRelease}
            className='flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
          >
            <Download className='w-3.5 h-3.5' />
            Download Update
          </button>
          <button
            onClick={() => setDismissed(true)}
            className='rounded-md p-1.5 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring'
            aria-label='Dismiss'
          >
            <X className='w-4 h-4 text-muted-foreground' />
          </button>
        </div>
      </div>
    </div>
  );
}

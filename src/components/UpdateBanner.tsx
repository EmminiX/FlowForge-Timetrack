// UpdateBanner - shows when a new version is available

import { useState, useEffect } from 'react';
import { ExternalLink, X, RefreshCw } from 'lucide-react';

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

  const handleOpenRelease = () => {
    window.open(updateInfo.releaseUrl, '_blank');
  };

  return (
    <div className='bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 px-4 py-2'>
      <div className='max-w-4xl mx-auto flex items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <RefreshCw className='w-4 h-4 text-primary animate-spin-slow' />
          <span className='text-sm'>
            <strong>FlowForge-Track {updateInfo.latestVersion}</strong> is available!
            <span className='text-muted-foreground ml-2'>
              (You have {updateInfo.currentVersion})
            </span>
          </span>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={handleOpenRelease}
            className='flex items-center gap-1 text-sm text-primary hover:underline'
          >
            <ExternalLink className='w-3 h-3' />
            View Release & Download
          </button>
          <button
            onClick={() => setDismissed(true)}
            className='p-1 hover:bg-muted rounded'
            aria-label='Dismiss'
          >
            <X className='w-4 h-4 text-muted-foreground' />
          </button>
        </div>
      </div>
    </div>
  );
}

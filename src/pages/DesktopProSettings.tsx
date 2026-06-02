import { useEffect, useState } from 'react';
import { Download, LogIn, MonitorSmartphone, RefreshCw, Save, Timer } from 'lucide-react';
import { Button, Card, CardContent, Switch } from '../components/ui';
import { useSettings } from '../contexts/SettingsContext';
import { desktopProService, type DesktopProUpdateResult } from '../services/desktopProService';

function updateLabel(result: DesktopProUpdateResult | null): string {
  if (!result) return 'Ready to check';
  if (result.status === 'available') return 'Update available';
  if (result.status === 'none') return 'No update available';
  return 'Could not check updates';
}

export function DesktopProSettings() {
  const { settings, updateSetting } = useSettings();
  const [launchAtLogin, setLaunchAtLogin] = useState(settings.launchAtLogin);
  const [autostartSupported, setAutostartSupported] = useState<boolean | null>(null);
  const [autostartError, setAutostartError] = useState('');
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateResult, setUpdateResult] = useState<DesktopProUpdateResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    desktopProService.getAutostartEnabled().then((status) => {
      if (cancelled) return;
      setAutostartSupported(status.supported);
      setAutostartError(status.error ?? '');
      setLaunchAtLogin(status.supported ? status.enabled : settings.launchAtLogin);
    });

    return () => {
      cancelled = true;
    };
  }, [settings.launchAtLogin]);

  const toggleLaunchAtLogin = async (enabled: boolean) => {
    setLaunchAtLogin(enabled);
    const status = await desktopProService.setAutostart(enabled);
    setAutostartSupported(status.supported);
    setAutostartError(status.error ?? '');

    if (status.supported) {
      setLaunchAtLogin(status.enabled);
      await updateSetting('launchAtLogin', status.enabled);
    }
  };

  const checkUpdates = async () => {
    setCheckingUpdates(true);
    try {
      setUpdateResult(await desktopProService.checkForUpdate());
    } finally {
      setCheckingUpdates(false);
    }
  };

  return (
    <Card>
      <CardContent className='space-y-5'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h2 className='text-lg font-semibold text-foreground'>Desktop Pro Mode</h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              Native controls for running TimeSage like a full desktop app.
            </p>
          </div>
          <MonitorSmartphone className='h-5 w-5 shrink-0 text-muted-foreground' />
        </div>

        <div className='grid gap-3 md:grid-cols-2'>
          <div className='rounded-md border border-border p-4'>
            <div className='flex items-start gap-3'>
              <Timer className='mt-0.5 h-5 w-5 text-muted-foreground' />
              <div>
                <p className='font-medium text-foreground'>System tray controls</p>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Show the app, toggle the timer widget, or quit from the tray menu.
                </p>
              </div>
            </div>
          </div>

          <div className='rounded-md border border-border p-4'>
            <div className='flex items-start gap-3'>
              <Save className='mt-0.5 h-5 w-5 text-muted-foreground' />
              <div>
                <p className='font-medium text-foreground'>Saved window position</p>
                <p className='mt-1 text-sm text-muted-foreground'>
                  The main window and floating widget reopen where you left them.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='flex items-center justify-between gap-4 border-t border-border pt-4'>
          <div className='flex min-w-0 items-start gap-3'>
            <LogIn className='mt-0.5 h-5 w-5 shrink-0 text-muted-foreground' />
            <div className='min-w-0'>
              <p className='font-medium text-foreground'>Launch at login</p>
              <p className='text-sm text-muted-foreground'>
                Start TimeSage automatically when you sign in.
              </p>
              {autostartSupported === false && (
                <p className='mt-1 text-xs text-muted-foreground'>
                  Available in the desktop app. Browser demo keeps this off.
                </p>
              )}
              {autostartError && <p className='mt-1 text-xs text-destructive'>{autostartError}</p>}
            </div>
          </div>
          <Switch
            checked={launchAtLogin}
            onCheckedChange={toggleLaunchAtLogin}
            aria-label='Launch at login'
          />
        </div>

        <div className='flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex min-w-0 items-start gap-3'>
            <Download className='mt-0.5 h-5 w-5 shrink-0 text-muted-foreground' />
            <div className='min-w-0'>
              <p className='font-medium text-foreground'>Native updater</p>
              <p className='text-sm text-muted-foreground'>
                Check for signed desktop updates, with the release feed as a fallback.
              </p>
              <p className='mt-1 text-sm text-muted-foreground'>{updateLabel(updateResult)}</p>
            </div>
          </div>
          <div className='flex shrink-0 items-center gap-3'>
            <Switch
              checked={settings.enableNativeUpdaterChecks}
              onCheckedChange={(enabled) => updateSetting('enableNativeUpdaterChecks', enabled)}
              aria-label='Native update checks'
            />
            <Button
              type='button'
              variant='outline'
              onClick={checkUpdates}
              loading={checkingUpdates}
              className='gap-2'
            >
              <RefreshCw className='h-4 w-4' />
              Check for updates
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

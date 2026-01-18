import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Volume2, VolumeX, Bell, BellOff, Palette, LayoutGrid, Building2, Save, Clock, RotateCcw } from 'lucide-react';
import type { AppSettings, Theme, FontSize, Density } from '../types';
import { FONT_SIZE_OPTIONS, DENSITY_OPTIONS, DEFAULT_SETTINGS } from '../types';
import { settingsService } from '../services';
import { useSettings } from '../contexts/SettingsContext';
import { toggleWidget } from '../lib/widgetWindow';
import { Button, Input, Textarea, Card, CardTitle, CardContent, CardDescription } from '../components/ui';
import clsx from 'clsx';

import { emit } from '@tauri-apps/api/event';

type TabId = 'general' | 'appearance' | 'accessibility' | 'business';

export function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { applyTheme, applyFontSize, applyDensity, reloadSettings } = useSettings();

  // Load settings
  useEffect(() => {
    settingsService.load()
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);

    // Apply visual changes immediately
    if (key === 'theme') applyTheme(value as Theme);
    if (key === 'fontSize') applyFontSize(value as FontSize);
    if (key === 'density') applyDensity(value as Density);

    // Broadcast preview to other windows
    emit('setting-preview', { key, value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.setMany(settings);
      setHasChanges(false);
      // Reload settings in context to sync globally
      await reloadSettings();
      // Broadcast change to other windows (like widget)
      await emit('settings-sync');
    } finally {
      setSaving(false);
    }
  };



  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Bell className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'accessibility', label: 'Accessibility', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'business', label: 'Business', icon: <Building2 className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        {hasChanges && (
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 -mb-px border-b-2 transition-colors text-sm font-medium',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <Card>
            <CardContent>
              <ToggleSetting
                label="Show Floating Timer Widget"
                description="Display an always-on-top mini timer window"
                checked={settings.showFloatingWidget}
                onChange={(v) => {
                  updateSetting('showFloatingWidget', v);
                  toggleWidget(v).catch(console.error);
                }}
                icon={<Bell className="w-5 h-5" />}
              />
            </CardContent>
          </Card>


          <Card>
            <CardContent>
              <ToggleSetting
                label="Sound Feedback"
                description="Play sounds when starting/stopping timer"
                checked={settings.enableSoundFeedback}
                onChange={(v) => updateSetting('enableSoundFeedback', v)}
                icon={settings.enableSoundFeedback ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <ToggleSetting
                label="Pomodoro Timer"
                description="Get break reminders after working for a set duration"
                checked={settings.pomodoroEnabled}
                onChange={(v) => updateSetting('pomodoroEnabled', v)}
                icon={<Clock className="w-5 h-5" />}
              />

              {settings.pomodoroEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                      <label className="block text-sm font-medium mb-2">Work Duration (minutes)</label>
                      <Input
                        type="number"
                        value={settings.pomodoroWorkMinutes || ''}
                        onChange={(e) => updateSetting('pomodoroWorkMinutes', e.target.value === '' ? 0 : parseInt(e.target.value))}
                        onBlur={() => {
                          if (!settings.pomodoroWorkMinutes || settings.pomodoroWorkMinutes < 1) {
                            updateSetting('pomodoroWorkMinutes', 25);
                          }
                        }}
                        min={1}
                        max={120}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Break Duration (minutes)</label>
                      <Input
                        type="number"
                        value={settings.pomodoroBreakMinutes || ''}
                        onChange={(e) => updateSetting('pomodoroBreakMinutes', e.target.value === '' ? 0 : parseInt(e.target.value))}
                        onBlur={() => {
                          if (!settings.pomodoroBreakMinutes || settings.pomodoroBreakMinutes < 1) {
                            updateSetting('pomodoroBreakMinutes', 5);
                          }
                        }}
                        min={1}
                        max={60}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateSetting('pomodoroWorkMinutes', 25);
                        updateSetting('pomodoroBreakMinutes', 5);
                      }}
                      className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset to Defaults
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <div className="flex gap-3">
                  <ThemeButton
                    theme="light"
                    current={settings.theme}
                    onClick={() => updateSetting('theme', 'light')}
                    icon={<Sun className="w-5 h-5" />}
                    label="Light"
                  />
                  <ThemeButton
                    theme="dark"
                    current={settings.theme}
                    onClick={() => updateSetting('theme', 'dark')}
                    icon={<Moon className="w-5 h-5" />}
                    label="Dark"
                  />
                  <ThemeButton
                    theme="system"
                    current={settings.theme}
                    onClick={() => updateSetting('theme', 'system')}
                    icon={<Monitor className="w-5 h-5" />}
                    label="System"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Font Size</label>
                <p className="text-sm text-muted-foreground mb-3">
                  This scales ALL text throughout the entire app.
                </p>
                <div className="flex gap-2">
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateSetting('fontSize', option.value)}
                      className={clsx(
                        'px-4 py-2 rounded-lg border transition-colors',
                        settings.fontSize === option.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:bg-muted'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Density</label>
                <p className="text-sm text-muted-foreground mb-3">
                  Adjusts spacing and padding throughout the app.
                </p>
                <div className="flex gap-2">
                  {DENSITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateSetting('density', option.value)}
                      className={clsx(
                        'px-4 py-2 rounded-lg border transition-colors',
                        settings.density === option.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:bg-muted'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Accessibility Tab */}
      {activeTab === 'accessibility' && (
        <div className="space-y-6">

          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent>
              <CardTitle className="text-blue-800 dark:text-blue-300 mb-2">
                Neurodivergent-Friendly Design
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-400">
                FlowForge was designed with neurodivergent users in mind. Features include:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Large touch targets (minimum 44pt)</li>
                  <li>Clear labels with icons</li>
                  <li>Smooth, subtle transitions</li>
                  <li>High contrast text</li>
                  <li>Always-visible timer widget</li>
                  <li>Uncluttered, focused interfaces</li>
                </ul>
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Business Tab */}
      {activeTab === 'business' && (
        <div className="space-y-6">
          <Card>
            <CardTitle className="px-6 pt-6 text-base">Invoice Information</CardTitle>
            <CardDescription className="px-6 pb-2">
              This information appears on your generated invoices.
            </CardDescription>
            <CardContent className="space-y-4">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Business Logo
                </label>
                {settings.businessLogo ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={settings.businessLogo}
                      alt="Business Logo"
                      className="w-24 h-24 object-contain border border-border rounded-lg p-2 bg-background"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => updateSetting('businessLogo', null)}
                    >
                      Remove Logo
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Building2 className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-primary">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 1MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1024 * 1024) {
                            alert('File size must be less than 1MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const base64 = event.target?.result as string;
                            updateSetting('businessLogo', base64);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <Input
                label="Business Name"
                value={settings.businessName}
                onChange={(e) => updateSetting('businessName', e.target.value)}
                placeholder="Your Company Name"
              />

              <Textarea
                label="Business Address"
                value={settings.businessAddress}
                onChange={(e) => updateSetting('businessAddress', e.target.value)}
                placeholder="123 Main St&#10;City, State 12345&#10;Country"
                rows={3}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Email"
                  type="email"
                  value={settings.businessEmail}
                  onChange={(e) => updateSetting('businessEmail', e.target.value)}
                  placeholder="billing@company.com"
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={settings.businessPhone}
                  onChange={(e) => updateSetting('businessPhone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <Input
                label="VAT Number"
                value={settings.businessVatNumber}
                onChange={(e) => updateSetting('businessVatNumber', e.target.value)}
                placeholder="e.g., GB123456789"
              />

              <Input
                label="Default Tax Rate (%)"
                type="number"
                value={settings.defaultTaxRate * 100}
                onChange={(e) => updateSetting('defaultTaxRate', (parseFloat(e.target.value) || 0) / 100)}
                min={0}
                max={100}
                step={0.1}
              />

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Input
                      label="Payment Link 1 Title"
                      value={settings.paymentLinkTitle || ''}
                      onChange={(e) => updateSetting('paymentLinkTitle', e.target.value)}
                      placeholder="e.g. Pay via Stripe"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Payment Link 1 URL"
                      value={settings.paymentLink || ''}
                      onChange={(e) => updateSetting('paymentLink', e.target.value)}
                      placeholder="https://paypal.me/yourbusiness"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Input
                      label="Payment Link 2 Title"
                      value={settings.paymentLink2Title || ''}
                      onChange={(e) => updateSetting('paymentLink2Title', e.target.value)}
                      placeholder="e.g. Pay via Venmo"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Payment Link 2 URL"
                      value={settings.paymentLink2 || ''}
                      onChange={(e) => updateSetting('paymentLink2', e.target.value)}
                      placeholder="https://venmo.com/yourbusiness"
                    />
                  </div>
                </div>
              </div>

              <Textarea
                label="Payment Terms"
                value={settings.paymentTerms}
                onChange={(e) => updateSetting('paymentTerms', e.target.value)}
                placeholder="Payment is due within 30 days of invoice date.&#10;&#10;Bank Transfer Details:&#10;IBAN: ...&#10;BIC: ..."
                rows={6}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Toggle Setting Component
interface ToggleSettingProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon?: React.ReactNode;
}

function ToggleSetting({ label, description, checked, onChange, icon }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div>
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={clsx(
          'w-12 h-7 rounded-full transition-colors relative',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <div
          className={clsx(
            'w-5 h-5 bg-white rounded-full absolute top-1 transition-transform shadow',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

// Theme Button Component
interface ThemeButtonProps {
  theme: Theme;
  current: Theme;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ThemeButton({ theme, current, onClick, icon, label }: ThemeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors min-w-[80px]',
        current === theme
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-muted-foreground'
      )}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}

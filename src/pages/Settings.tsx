import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Volume2, VolumeX, Bell, Palette, LayoutGrid, Building2, Clock, RotateCcw, BookOpen, ChevronDown, ChevronUp, Timer, Users, Briefcase, FileText, Package, Zap, Coffee, Keyboard, BarChart3, PauseCircle } from 'lucide-react';
import type { AppSettings, Theme, FontSize, Density } from '../types';
import { FONT_SIZE_OPTIONS, DENSITY_OPTIONS, DEFAULT_SETTINGS } from '../types';
// settingsService is accessed through useSettings context
import { useSettings } from '../contexts/SettingsContext';
import { toggleWidget } from '../lib/widgetWindow';
import { Button, Input, Textarea, Card, CardTitle, CardContent, CardDescription } from '../components/ui';
import clsx from 'clsx';

import { emit } from '@tauri-apps/api/event';

type TabId = 'general' | 'appearance' | 'accessibility' | 'business' | 'guide';

export function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const { settings: globalSettings, updateSetting: persistSetting, applyTheme, applyFontSize, applyDensity } = useSettings();

  // Local state for immediate feedback and input handling
  const [localSettings, setLocalSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Sync local state with global settings when they change (e.g. initial load or external update)
  useEffect(() => {
    setLocalSettings(globalSettings);
  }, [globalSettings]);

  // Handle immediate visual updates and local state
  const handleLocalChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));

    // Apply visual changes immediately for preview
    if (key === 'theme') applyTheme(value as Theme);
    if (key === 'fontSize') applyFontSize(value as FontSize);
    if (key === 'density') applyDensity(value as Density);

    // Broadcast preview to other windows
    emit('setting-preview', { key, value });
  };

  // Persist setting to database (Auto-Save)
  const handleAutoSave = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    // First update locally/visually
    handleLocalChange(key, value);

    // Then persist
    try {
      await persistSetting(key, value);
      // Notify other windows to reload settings
      await emit('settings-sync');
    } catch (error) {
      console.error(`Failed to auto-save ${key}:`, error);
    }
  };




  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Bell className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'accessibility', label: 'Accessibility', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'business', label: 'Business', icon: <Building2 className="w-4 h-4" /> },
    { id: 'guide', label: 'Guide', icon: <BookOpen className="w-4 h-4" /> },
  ];



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
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
                checked={localSettings.showFloatingWidget}
                onChange={(v) => {
                  handleAutoSave('showFloatingWidget', v);
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
                checked={localSettings.enableSoundFeedback}
                onChange={(v) => handleAutoSave('enableSoundFeedback', v)}
                icon={localSettings.enableSoundFeedback ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <ToggleSetting
                label="Pomodoro Timer"
                description="Get break reminders after working for a set duration"
                checked={localSettings.pomodoroEnabled}
                onChange={(v) => handleAutoSave('pomodoroEnabled', v)}
                icon={<Clock className="w-5 h-5" />}
              />

              {localSettings.pomodoroEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                      <label className="block text-sm font-medium mb-2">Work Duration (minutes)</label>
                      <Input
                        type="number"
                        value={localSettings.pomodoroWorkMinutes || ''}
                        onChange={(e) => handleLocalChange('pomodoroWorkMinutes', e.target.value === '' ? 0 : parseInt(e.target.value))}
                        onBlur={() => {
                          let val = localSettings.pomodoroWorkMinutes;
                          if (!val || val < 1) val = 25;
                          handleAutoSave('pomodoroWorkMinutes', val);
                        }}
                        min={1}
                        max={120}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Break Duration (minutes)</label>
                      <Input
                        type="number"
                        value={localSettings.pomodoroBreakMinutes || ''}
                        onChange={(e) => handleLocalChange('pomodoroBreakMinutes', e.target.value === '' ? 0 : parseInt(e.target.value))}
                        onBlur={() => {
                          let val = localSettings.pomodoroBreakMinutes;
                          if (!val || val < 1) val = 5;
                          handleAutoSave('pomodoroBreakMinutes', val);
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
                        handleAutoSave('pomodoroWorkMinutes', 25);
                        handleAutoSave('pomodoroBreakMinutes', 5);
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

          <Card>
            <CardContent className="space-y-4">
              <ToggleSetting
                label="Auto-Pause When Idle"
                description="Automatically pause the timer when you step away from your computer"
                checked={localSettings.enableIdleDetection}
                onChange={(v) => handleAutoSave('enableIdleDetection', v)}
                icon={<Clock className="w-5 h-5" />}
              />

              {localSettings.enableIdleDetection && (
                <div className="pt-4 border-t border-border">
                  <label className="block text-sm font-medium mb-2">Idle Threshold</label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Minutes of inactivity before the timer pauses
                  </p>
                  <div className="flex gap-2">
                    {[2, 5, 10, 15, 30].map((minutes) => (
                      <button
                        key={minutes}
                        onClick={() => handleAutoSave('idleThresholdMinutes', minutes)}
                        className={clsx(
                          'px-4 py-2 rounded-lg border transition-colors',
                          localSettings.idleThresholdMinutes === minutes
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:bg-muted'
                        )}
                      >
                        {minutes}m
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    When you return, you'll be asked what to do with the idle time.
                  </p>
                </div>
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
                    current={localSettings.theme}
                    onClick={() => handleAutoSave('theme', 'light')}
                    icon={<Sun className="w-5 h-5" />}
                    label="Light"
                  />
                  <ThemeButton
                    theme="dark"
                    current={localSettings.theme}
                    onClick={() => handleAutoSave('theme', 'dark')}
                    icon={<Moon className="w-5 h-5" />}
                    label="Dark"
                  />
                  <ThemeButton
                    theme="system"
                    current={localSettings.theme}
                    onClick={() => handleAutoSave('theme', 'system')}
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
                      onClick={() => handleAutoSave('fontSize', option.value)}
                      className={clsx(
                        'px-4 py-2 rounded-lg border transition-colors',
                        localSettings.fontSize === option.value
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
                      onClick={() => handleAutoSave('density', option.value)}
                      className={clsx(
                        'px-4 py-2 rounded-lg border transition-colors',
                        localSettings.density === option.value
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
                FlowForge-Track was designed with neurodivergent users in mind. Features include:
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
                {localSettings.businessLogo ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={localSettings.businessLogo}
                      alt="Business Logo"
                      className="w-24 h-24 object-contain border border-border rounded-lg p-2 bg-background"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleAutoSave('businessLogo', null)}
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
                            handleAutoSave('businessLogo', base64);
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
                value={localSettings.businessName}
                onChange={(e) => handleLocalChange('businessName', e.target.value)}
                onBlur={() => handleAutoSave('businessName', localSettings.businessName)}
                placeholder="Your Company Name"
              />

              <Textarea
                label="Business Address"
                value={localSettings.businessAddress}
                onChange={(e) => handleLocalChange('businessAddress', e.target.value)}
                onBlur={() => handleAutoSave('businessAddress', localSettings.businessAddress)}
                placeholder="123 Main St&#10;City, State 12345&#10;Country"
                rows={3}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Email"
                  type="email"
                  value={localSettings.businessEmail}
                  onChange={(e) => handleLocalChange('businessEmail', e.target.value)}
                  onBlur={() => handleAutoSave('businessEmail', localSettings.businessEmail)}
                  placeholder="billing@company.com"
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={localSettings.businessPhone}
                  onChange={(e) => handleLocalChange('businessPhone', e.target.value)}
                  onBlur={() => handleAutoSave('businessPhone', localSettings.businessPhone)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <Input
                label="VAT Number"
                value={localSettings.businessVatNumber}
                onChange={(e) => handleLocalChange('businessVatNumber', e.target.value)}
                onBlur={() => handleAutoSave('businessVatNumber', localSettings.businessVatNumber)}
                placeholder="e.g., GB123456789"
              />

              <Input
                label="Default Tax Rate (%)"
                type="number"
                value={localSettings.defaultTaxRate * 100}
                onChange={(e) => handleLocalChange('defaultTaxRate', (parseFloat(e.target.value) || 0) / 100)}
                onBlur={() => handleAutoSave('defaultTaxRate', localSettings.defaultTaxRate)}
                min={0}
                max={100}
                step={0.1}
              />

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Input
                      label="Payment Link 1 Title"
                      value={localSettings.paymentLinkTitle || ''}
                      onChange={(e) => handleLocalChange('paymentLinkTitle', e.target.value)}
                      onBlur={() => handleAutoSave('paymentLinkTitle', localSettings.paymentLinkTitle)}
                      placeholder="e.g. Pay via Stripe"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Payment Link 1 URL"
                      value={localSettings.paymentLink || ''}
                      onChange={(e) => handleLocalChange('paymentLink', e.target.value)}
                      onBlur={() => handleAutoSave('paymentLink', localSettings.paymentLink)}
                      placeholder="https://paypal.me/yourbusiness"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Input
                      label="Payment Link 2 Title"
                      value={localSettings.paymentLink2Title || ''}
                      onChange={(e) => handleLocalChange('paymentLink2Title', e.target.value)}
                      onBlur={() => handleAutoSave('paymentLink2Title', localSettings.paymentLink2Title)}
                      placeholder="e.g. Pay via Venmo"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Payment Link 2 URL"
                      value={localSettings.paymentLink2 || ''}
                      onChange={(e) => handleLocalChange('paymentLink2', e.target.value)}
                      onBlur={() => handleAutoSave('paymentLink2', localSettings.paymentLink2)}
                      placeholder="https://venmo.com/yourbusiness"
                    />
                  </div>
                </div>
              </div>

              <Textarea
                label="Payment Terms"
                value={localSettings.paymentTerms}
                onChange={(e) => handleLocalChange('paymentTerms', e.target.value)}
                onBlur={() => handleAutoSave('paymentTerms', localSettings.paymentTerms)}
                placeholder="Payment is due within 30 days of invoice date.&#10;&#10;Bank Transfer Details:&#10;IBAN: ...&#10;BIC: ..."
                rows={6}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Guide Tab */}
      {activeTab === 'guide' && (
        <div className="space-y-4">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-6 h-6 text-primary" />
                <CardTitle className="text-xl">Welcome to FlowForge-Track!</CardTitle>
              </div>
              <CardDescription className="text-base">
                FlowForge-Track is your all-in-one time tracking and invoicing companion.
                This guide will walk you through every feature step by step.
              </CardDescription>
            </CardContent>
          </Card>

          <GuideSection
            icon={<Timer className="w-5 h-5" />}
            title="Timer & Time Tracking"
            defaultOpen={true}
          >
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Starting the Timer</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Go to the <strong>Timer</strong> page (home screen)</li>
                  <li>Select a project from the dropdown menu</li>
                  <li>Click the <strong>Play</strong> button to start tracking</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Timer Controls</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Pause:</strong> Temporarily stop without finishing</li>
                  <li>• <strong>Resume:</strong> Continue from where you paused</li>
                  <li>• <strong>Stop:</strong> End the session and save it as a time entry</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                <strong>💡 Tip:</strong> When you stop the timer, a time entry is automatically created and saved.
              </div>
            </div>
          </GuideSection>

          <GuideSection
            icon={<div className="w-5 h-5 border-2 border-current rounded" />}
            title="Floating Widget"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The floating widget is a small, always-on-top window that shows your timer status even when FlowForge-Track is minimized.
              </p>
              <div>
                <h4 className="font-medium mb-2">Widget Features</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Shows current project name and elapsed time</li>
                  <li>• <strong>Play/Pause button:</strong> Control your timer</li>
                  <li>• <strong>Stop button:</strong> End the current session</li>
                  <li>• <strong>Open App button:</strong> Bring FlowForge-Track to focus</li>
                  <li>• <strong>Drag handle:</strong> Move the widget anywhere on screen</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                <strong>💡 Tip:</strong> Enable or disable the widget in Settings → General → "Show Floating Timer Widget"
              </div>
            </div>
          </GuideSection>

          <GuideSection
            icon={<Coffee className="w-5 h-5" />}
            title="Pomodoro Timer"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The Pomodoro technique helps you work in focused intervals with regular breaks, improving productivity and reducing burnout.
              </p>
              <div>
                <h4 className="font-medium mb-2">How It Works</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Work for a set duration (default: 25 minutes)</li>
                  <li>When time's up, you'll see a break notification</li>
                  <li>Click "Start Break" to pause work and rest</li>
                  <li>After your break, click "Resume Work" to continue</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Customizing</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Go to Settings → General → Pomodoro Timer</li>
                  <li>• Set your preferred work duration (1-120 minutes)</li>
                  <li>• Set your preferred break duration (1-60 minutes)</li>
                  <li>• Default is 25 minutes work / 5 minutes break</li>
                </ul>
              </div>
            </div>
          </GuideSection>

          <GuideSection
            icon={<Users className="w-5 h-5" />}
            title="Managing Clients"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Clients are the people or companies you work for. Store their details to use when creating invoices.
              </p>
              <div>
                <h4 className="font-medium mb-2">Adding a Client</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Go to the <strong>Clients</strong> page</li>
                  <li>Click <strong>New Client</strong></li>
                  <li>Fill in their details (only Name is required)</li>
                  <li>Click <strong>Create Client</strong></li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Client Details</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Name:</strong> Client or company name (required)</li>
                  <li>• <strong>Email:</strong> For invoice delivery</li>
                  <li>• <strong>Address:</strong> Appears on invoices</li>
                  <li>• <strong>Phone:</strong> Contact number</li>
                  <li>• <strong>VAT Number:</strong> For tax purposes</li>
                  <li>• <strong>Hourly Rate:</strong> Default rate for this client</li>
                  <li>• <strong>Notes:</strong> Private notes (click the note icon to view)</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                <strong>💡 Tip:</strong> Client cards show statistics like total hours, billable amount, and project count.
              </div>
            </div>
          </GuideSection>

          <GuideSection
            icon={<Briefcase className="w-5 h-5" />}
            title="Managing Projects"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Projects help you organize your work. Each project can be linked to a client and has its own color for easy identification.
              </p>
              <div>
                <h4 className="font-medium mb-2">Creating a Project</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Go to the <strong>Projects</strong> page</li>
                  <li>Click <strong>New Project</strong></li>
                  <li>Enter a name and optional description</li>
                  <li>Select a client (optional)</li>
                  <li>Choose a color for visual identification</li>
                  <li>Click <strong>Create Project</strong></li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Project Statuses</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Active:</strong> Currently working on this project</li>
                  <li>• <strong>Paused:</strong> Temporarily on hold</li>
                  <li>• <strong>Completed:</strong> Finished project (hidden from timer)</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                <strong>💡 Tip:</strong> Only Active projects appear in the timer dropdown. Change status to control visibility.
              </div>
            </div>
          </GuideSection>

          <GuideSection
            icon={<Clock className="w-5 h-5" />}
            title="Time Entries"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Time entries are individual work sessions. They're created automatically when you stop the timer.
              </p>
              <div>
                <h4 className="font-medium mb-2">Viewing Entries</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Entries are grouped by Client → Project</li>
                  <li>• Each entry shows date, time, and duration</li>
                  <li>• Use filters to find specific entries</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Billed vs Unbilled</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Unbilled (gray):</strong> Not yet added to an invoice</li>
                  <li>• <strong>Billed (green):</strong> Already included in an invoice</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Bulk Actions</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Select entries using checkboxes</li>
                  <li>Use the action buttons that appear:</li>
                </ol>
                <ul className="space-y-1 text-sm text-muted-foreground ml-6 mt-1">
                  <li>• <strong>Mark as Billed:</strong> Manually mark entries as invoiced</li>
                  <li>• <strong>Mark as Unbilled:</strong> Revert billed entries</li>
                  <li>• <strong>Delete:</strong> Remove selected entries</li>
                </ul>
              </div>
            </div>
          </GuideSection>

          <GuideSection
            icon={<FileText className="w-5 h-5" />}
            title="Creating Invoices"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                FlowForge-Track makes invoicing easy by automatically importing your unbilled time entries.
              </p>
              <div>
                <h4 className="font-medium mb-2">Step-by-Step Invoice Creation</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Go to the <strong>Invoices</strong> page</li>
                  <li>Click <strong>New Invoice</strong></li>
                  <li>Select a client from the dropdown</li>
                  <li>Click <strong>Next</strong> – your unbilled hours are loaded automatically!</li>
                  <li>Review and edit line items as needed</li>
                  <li>Set issue date, due date, and notes</li>
                  <li>Click <strong>Create Invoice</strong></li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Adding Extra Items</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Add stored item:</strong> Select from your saved Products</li>
                  <li>• <strong>+ Add Line:</strong> Create a custom line item manually</li>
                  <li>• You can edit descriptions, quantities, and prices freely</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Invoice Actions</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Preview:</strong> View the full invoice with your business details</li>
                  <li>• <strong>Export PDF:</strong> Download a professional PDF</li>
                  <li>• <strong>Edit:</strong> Modify invoice details</li>
                  <li>• <strong>Change Status:</strong> Use the dropdown on each invoice card (Draft, Sent, Paid, Overdue, Cancelled)</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                <strong>💡 Tip:</strong> Only the time entries included in the final saved invoice are marked as "billed". If you remove an entry before saving, it stays unbilled.
              </div>
            </div>
          </GuideSection>

          <GuideSection
            icon={<Package className="w-5 h-5" />}
            title="Products & Services"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Save frequently used items with preset prices to add to invoices quickly.
              </p>
              <div>
                <h4 className="font-medium mb-2">Creating a Product</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Go to the <strong>Products</strong> page</li>
                  <li>Click <strong>New Item</strong></li>
                  <li>Enter a name, description, and price</li>
                  <li>Optionally add an SKU for reference</li>
                  <li>Click <strong>Create Item</strong></li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Using Products in Invoices</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Create or edit an invoice</li>
                  <li>In the Line Items step, find the "Add stored item..." dropdown</li>
                  <li>Select a product – it's added with preset name and price!</li>
                  <li>Adjust quantity as needed</li>
                </ol>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                <strong>💡 Tip:</strong> Click the eye icon on any product card to view its full description.
              </div>
            </div>
          </GuideSection>

          <GuideSection
            icon={<Building2 className="w-5 h-5" />}
            title="Business Settings"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set up your business information to appear on invoices.
              </p>
              <div>
                <h4 className="font-medium mb-2">Available Fields</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Logo:</strong> Upload your business logo (PNG/JPG, max 1MB)</li>
                  <li>• <strong>Name:</strong> Your business or freelancer name</li>
                  <li>• <strong>Address:</strong> Full business address</li>
                  <li>• <strong>Email & Phone:</strong> Contact information</li>
                  <li>• <strong>VAT Number:</strong> For tax compliance</li>
                  <li>• <strong>Default Tax Rate:</strong> Auto-applied to new invoices</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Payment Options</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Payment Links (x2):</strong> Add links to PayPal, Stripe, Venmo, etc.</li>
                  <li>• <strong>Custom Titles:</strong> Name each payment link (e.g., "Pay via PayPal")</li>
                  <li>• <strong>Payment Terms:</strong> Bank details, IBAN, instructions, etc.</li>
                </ul>
              </div>
            </div>
          </GuideSection>

          <GuideSection
            icon={<Palette className="w-5 h-5" />}
            title="Appearance Settings"
          >
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Theme</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Light:</strong> Bright, clean interface</li>
                  <li>• <strong>Dark:</strong> Easy on the eyes, great for night work</li>
                  <li>• <strong>System:</strong> Follows your OS settings automatically</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Font Size</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Choose from Small, Medium, Large, or Extra Large</li>
                  <li>• Affects all text throughout the app</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Density</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Compact:</strong> More content, less spacing</li>
                  <li>• <strong>Comfortable:</strong> Balanced (default)</li>
                  <li>• <strong>Spacious:</strong> More breathing room</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                <strong>💡 Tip:</strong> All appearance changes save automatically – no need to click Save!
              </div>
            </div>
          </GuideSection>

          <GuideSection
            icon={<Keyboard className="w-5 h-5" />}
            title="Global Shortcuts"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Control FlowForge-Track from anywhere, even when the app is in the background.
              </p>
              <div>
                <h4 className="font-medium mb-2">Available Shortcuts</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Cmd/Ctrl + Shift + S:</strong> Start or Resume timer</li>
                  <li>• <strong>Cmd/Ctrl + Shift + P:</strong> Pause timer</li>
                  <li>• <strong>Cmd/Ctrl + Shift + X:</strong> Stop timer and save entry</li>
                  <li>• <strong>Cmd/Ctrl + Shift + W:</strong> Toggle floating widget</li>
                  <li>• <strong>Cmd/Ctrl + Shift + M:</strong> Toggle sound feedback</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                <strong>💡 Tip:</strong> These work globally! You don't need to have the FlowForge window focused.
              </div>
            </div>
          </GuideSection>

          <GuideSection
            icon={<BarChart3 className="w-5 h-5" />}
            title="Dashboard Analytics"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Get visual insights into your productivity on the main dashboard.
              </p>
              <div>
                <h4 className="font-medium mb-2">Features</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Today's Summary:</strong> See exactly how your day is broken down by project.</li>
                  <li>• <strong>Weekly Progress:</strong> Visual bar chart of your hours for the last 7 days.</li>
                  <li>• <strong>Quick Stats:</strong> At-a-glance view of unbilled revenue and total weekly hours.</li>
                </ul>
              </div>
            </div>
          </GuideSection>

          <GuideSection
            icon={<PauseCircle className="w-5 h-5" />}
            title="Automatic Idle Detection"
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Never worry about forgetting to pause your timer when you walk away.
              </p>
              <div>
                <h4 className="font-medium mb-2">How It Works</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>If you stop moving your mouse/keyboard for a set time (default 5 mins), the timer pauses automatically.</li>
                  <li>When you return, you'll be asked what to do with the time you were away.</li>
                  <li>Options: <strong>Discard</strong> (remove idle time), <strong>Keep</strong> (add it to work), or <strong>Adjust</strong> manually.</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">Configuration</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Go to <strong>Settings → General</strong> to enable/disable.</li>
                  <li>• Adjust the "Idle Threshold" to choose how long to wait before pausing (2-30 minutes).</li>
                </ul>
              </div>
            </div>
          </GuideSection>

          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="py-6">
              <CardTitle className="text-green-800 dark:text-green-300 mb-2">
                🎉 You're All Set!
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-400">
                You now know everything FlowForge-Track can do. Start tracking your time and creating invoices with ease!
              </CardDescription>
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

// Guide Section Component (Collapsible)
interface GuideSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function GuideSection({ icon, title, children, defaultOpen = false }: GuideSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="text-primary">{icon}</div>
          <span className="font-medium text-foreground">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0 border-t border-border">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </Card>
  );
}

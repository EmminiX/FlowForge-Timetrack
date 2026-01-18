import { listen } from '@tauri-apps/api/event';

// Settings context and provider for app-wide settings application
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { AppSettings, Theme, FontSize, AnimationPreference, Density } from '../types';
import { DEFAULT_SETTINGS, FONT_SIZE_SCALE } from '../types';
import { settingsService } from '../services';
import { toggleWidget } from '../lib/widgetWindow';

// Density scale values (padding, gaps, margins)
const DENSITY_SCALE: Record<Density, number> = {
    compact: 0.75,
    comfortable: 1.0,
    spacious: 1.25,
};

interface SettingsContextType {
    settings: AppSettings;
    loading: boolean;
    applyTheme: (theme: Theme) => void;
    applyFontSize: (fontSize: FontSize) => void;
    applyDensity: (density: Density) => void;
    applyAnimations: (preference: AnimationPreference) => void;
    updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
    reloadSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    const applyTheme = useCallback((theme: Theme) => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.remove('dark');
        } else {
            // System preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    }, []);

    const applyFontSize = useCallback((fontSize: FontSize) => {
        const scale = FONT_SIZE_SCALE[fontSize];
        document.documentElement.style.fontSize = `${scale * 16}px`;
    }, []);

    const applyDensity = useCallback((density: Density) => {
        const scale = DENSITY_SCALE[density];
        document.documentElement.style.setProperty('--density-scale', scale.toString());
        // Apply to common spacing classes
        document.documentElement.dataset.density = density;
    }, []);

    const applyAnimations = useCallback((preference: AnimationPreference) => {
        const root = document.documentElement;
        let effective: 'enabled' | 'disabled';

        if (preference === 'enabled') {
            effective = 'enabled';
        } else if (preference === 'disabled') {
            effective = 'disabled';
        } else {
            // System
            effective = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'disabled'
                : 'enabled';
        }

        root.dataset.animations = effective;
    }, []);

    const loadAndApplySettings = useCallback(async () => {
        try {
            const loaded = await settingsService.load();
            setSettings(loaded);
            applyTheme(loaded.theme);
            applyFontSize(loaded.fontSize);
            applyDensity(loaded.density);
            applyAnimations(loaded.animationPreference);

            // Apply Widget State
            toggleWidget(loaded.showFloatingWidget).catch(error => {
                console.warn('Failed to toggle widget on startup:', error);
            });

        } catch (error) {
            console.error('Failed to load settings:', error);
            // Apply defaults
            applyTheme(DEFAULT_SETTINGS.theme);
            applyFontSize(DEFAULT_SETTINGS.fontSize);
            applyDensity(DEFAULT_SETTINGS.density);
            applyAnimations(DEFAULT_SETTINGS.animationPreference);
            // Default for widget is 'true' in DEFAULT_SETTINGS? Let's check types/settings.ts if needed, 
            // but effectively valid loaded settings should have it.
        } finally {
            setLoading(false);
        }
    }, [applyTheme, applyFontSize, applyDensity, applyAnimations]);

    const updateSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        try {
            await settingsService.set(key, value);
            await loadAndApplySettings();
        } catch (error) {
            console.error(`Failed to update setting ${key}:`, error);
        }
    }, [loadAndApplySettings]);

    // Load settings on mount
    useEffect(() => {
        loadAndApplySettings();
    }, [loadAndApplySettings]);

    // Listen for system theme/animation changes and cross-window sync
    useEffect(() => {
        const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
        const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

        const handleTheme = () => {
            if (settings.theme === 'system') applyTheme('system');
        };

        const handleMotion = () => {
            if (settings.animationPreference === 'system') applyAnimations('system');
        };

        themeMedia.addEventListener('change', handleTheme);
        motionMedia.addEventListener('change', handleMotion);

        // Listen for settings changes from other windows
        const unlistenSync = listen('settings-sync', () => {
            loadAndApplySettings();
        });

        // Listen for realtime previews from other windows
        const unlistenPreview = listen<{ key: keyof AppSettings; value: any }>('setting-preview', (event) => {
            const { key, value } = event.payload;
            if (key === 'theme') applyTheme(value as Theme);
            if (key === 'fontSize') applyFontSize(value as FontSize);
            if (key === 'density') applyDensity(value as Density);
            if (key === 'animationPreference') applyAnimations(value as AnimationPreference);
        });

        return () => {
            themeMedia.removeEventListener('change', handleTheme);
            motionMedia.removeEventListener('change', handleMotion);
            unlistenSync.then(f => f()).catch(() => { /* Already unlistened */ });
            unlistenPreview.then(f => f()).catch(() => { /* Already unlistened */ });
        };
    }, [settings.theme, settings.animationPreference, applyTheme, applyAnimations, loadAndApplySettings, applyDensity, applyFontSize]);

    return (
        <SettingsContext.Provider
            value={{
                settings,
                loading,
                applyTheme,
                applyFontSize,
                applyDensity,
                applyAnimations,
                updateSetting,
                reloadSettings: loadAndApplySettings,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

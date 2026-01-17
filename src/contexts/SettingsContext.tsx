// Settings context and provider for app-wide settings application
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { AppSettings, Theme, FontSize, Density } from '../types';
import { DEFAULT_SETTINGS, FONT_SIZE_SCALE } from '../types';
import { settingsService } from '../services';

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

    const loadAndApplySettings = useCallback(async () => {
        try {
            const loaded = await settingsService.load();
            setSettings(loaded);
            applyTheme(loaded.theme);
            applyFontSize(loaded.fontSize);
            applyDensity(loaded.density);
        } catch (error) {
            console.error('Failed to load settings:', error);
            // Apply defaults
            applyTheme(DEFAULT_SETTINGS.theme);
            applyFontSize(DEFAULT_SETTINGS.fontSize);
            applyDensity(DEFAULT_SETTINGS.density);
        } finally {
            setLoading(false);
        }
    }, [applyTheme, applyFontSize, applyDensity]);

    // Load settings on mount
    useEffect(() => {
        loadAndApplySettings();
    }, [loadAndApplySettings]);

    // Listen for system theme changes if using 'system' preference
    useEffect(() => {
        if (settings.theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => applyTheme('system');
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [settings.theme, applyTheme]);

    return (
        <SettingsContext.Provider
            value={{
                settings,
                loading,
                applyTheme,
                applyFontSize,
                applyDensity,
                reloadSettings: loadAndApplySettings,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

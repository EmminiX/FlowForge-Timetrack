// Settings context and provider for app-wide settings application
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { AppSettings, Theme, FontSize, AnimationPreference, Density } from '../types';
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
    applyAnimations: (preference: AnimationPreference) => void;
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
        } catch (error) {
            console.error('Failed to load settings:', error);
            // Apply defaults
            applyTheme(DEFAULT_SETTINGS.theme);
            applyFontSize(DEFAULT_SETTINGS.fontSize);
            applyDensity(DEFAULT_SETTINGS.density);
            applyAnimations(DEFAULT_SETTINGS.animationPreference);
        } finally {
            setLoading(false);
        }
    }, [applyTheme, applyFontSize, applyDensity, applyAnimations]);

    // Load settings on mount
    useEffect(() => {
        loadAndApplySettings();
    }, [loadAndApplySettings]);

    // Listen for system theme/animation changes
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

        return () => {
            themeMedia.removeEventListener('change', handleTheme);
            motionMedia.removeEventListener('change', handleMotion);
        };
    }, [settings.theme, settings.animationPreference, applyTheme, applyAnimations]);

    return (
        <SettingsContext.Provider
            value={{
                settings,
                loading,
                applyTheme,
                applyFontSize,
                applyDensity,
                applyAnimations,
                reloadSettings: loadAndApplySettings,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

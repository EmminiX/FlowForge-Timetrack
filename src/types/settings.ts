// Application settings types

export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large' | 'extraLarge';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type AnimationPreference = 'enabled' | 'disabled' | 'system';

export interface AppSettings {
    // General
    showFloatingWidget: boolean;
    enableNotifications: boolean;
    enableSoundFeedback: boolean;

    // Idle Detection
    enableIdleDetection: boolean;
    idleThresholdMinutes: number;

    // Pomodoro
    pomodoroEnabled: boolean;
    pomodoroWorkMinutes: number;
    pomodoroBreakMinutes: number;

    // Appearance
    theme: Theme;
    fontSize: FontSize;
    density: Density;

    // Accessibility
    animationPreference: AnimationPreference;

    // Business (for invoices)
    businessName: string;
    businessAddress: string;
    businessEmail: string;
    businessPhone: string;
    businessVatNumber: string;
    businessLogo: string | null; // base64 or file path
    defaultTaxRate: number;
    paymentTerms: string;
    paymentLink: string;
    paymentLinkTitle: string;
    paymentLink2: string;
    paymentLink2Title: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
    showFloatingWidget: true,
    enableNotifications: true,
    enableSoundFeedback: true,
    enableIdleDetection: true,
    idleThresholdMinutes: 5,
    pomodoroEnabled: false,
    pomodoroWorkMinutes: 25,
    pomodoroBreakMinutes: 5,
    theme: 'system',
    fontSize: 'medium',
    density: 'comfortable',
    animationPreference: 'system',
    businessName: '',
    businessAddress: '',
    businessEmail: '',
    businessPhone: '',
    businessVatNumber: '',
    businessLogo: null,
    defaultTaxRate: 0,
    paymentTerms: 'Payment is due within 30 days of invoice date.',
    paymentLink: '',
    paymentLinkTitle: 'Payment Link 1',
    paymentLink2: '',
    paymentLink2Title: 'Payment Link 2',
};

export const FONT_SIZE_SCALE: Record<FontSize, number> = {
    small: 0.85,
    medium: 1.0,
    large: 1.15,
    extraLarge: 1.3,
};

export const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'extraLarge', label: 'Extra Large' },
];

export const DENSITY_OPTIONS: { value: Density; label: string }[] = [
    { value: 'compact', label: 'Compact' },
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'spacious', label: 'Spacious' },
];

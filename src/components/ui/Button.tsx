import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors btn-press focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

        const variants = {
            primary: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary',
            secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary',
            destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive',
            ghost: 'hover:bg-muted focus:ring-muted',
            outline: 'border border-border bg-background hover:bg-muted focus:ring-muted',
        };

        const sizes = {
            sm: 'h-8 px-3 text-sm gap-1.5',
            md: 'h-10 px-4 text-base gap-2',
            lg: 'h-12 px-6 text-lg gap-2.5',
        };

        return (
            <button
                ref={ref}
                className={clsx(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || loading}
                {...props}
            >
                {loading && (
                    <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md border font-semibold transition-colors btn-press focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';

    const variants = {
      primary:
        'border-primary bg-primary text-primary-foreground shadow-[var(--shadow-subtle)] hover:bg-primary/90',
      secondary:
        'border-border bg-secondary text-secondary-foreground hover:border-primary/40 hover:bg-muted',
      destructive:
        'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90',
      ghost: 'border-transparent bg-transparent text-foreground hover:bg-muted',
      outline:
        'border-border bg-[var(--surface-raised)] text-foreground hover:border-primary/40 hover:bg-muted',
    };

    const sizes = {
      sm: 'min-h-11 px-3 text-sm gap-1.5',
      md: 'min-h-11 px-4 text-base gap-2',
      lg: 'min-h-12 px-6 text-lg gap-2.5',
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
            className='animate-spin h-4 w-4'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
          >
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            />
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

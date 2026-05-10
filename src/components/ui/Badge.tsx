import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  const variants = {
    default: 'border-border bg-muted text-muted-foreground',
    success: 'border-primary/30 bg-primary/12 text-primary',
    warning: 'border-accent/40 bg-accent/15 text-accent-foreground dark:text-accent',
    danger: 'border-destructive/30 bg-destructive/12 text-destructive',
    info: 'border-primary/25 bg-primary/10 text-primary',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md border font-medium',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}

// Status badge specifically for project/invoice statuses
export interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusVariants: Record<string, BadgeProps['variant']> = {
  active: 'success',
  paused: 'warning',
  completed: 'default',
  draft: 'default',
  sent: 'info',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'default',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = statusVariants[status.toLowerCase()] || 'default';
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

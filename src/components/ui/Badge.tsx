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
    default: 'bg-muted text-muted-foreground',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
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

import type { ReactNode } from 'react';
import { FileQuestion } from 'lucide-react';
import clsx from 'clsx';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Contextual explanation rendered below the description in a calmer voice — e.g. "why this is empty". */
  secondaryText?: string;
  action?: ReactNode;
  /**
   * Controls visual weight and vertical breathing room.
   * - `'guided'` — first-time / onboarding: standard icon, generous padding. Default.
   * - `'minimal'` — search / filter no-results: compact, less emphasis.
   */
  variant?: 'guided' | 'minimal';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  secondaryText,
  action,
  variant = 'guided',
  className,
}: EmptyStateProps) {
  const isGuided = variant === 'guided';

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center px-4 text-center',
        isGuided ? 'py-16' : 'py-10',
        className,
      )}
    >
      <div
        className={clsx(
          'rounded-full bg-muted flex items-center justify-center mb-5 text-muted-foreground',
          isGuided ? 'w-16 h-16' : 'w-12 h-12',
        )}
        aria-hidden='true'
      >
        {icon || <FileQuestion className={isGuided ? 'w-8 h-8' : 'w-6 h-6'} />}
      </div>
      <h3
        className={clsx(
          'font-semibold text-foreground',
          isGuided ? 'text-lg mb-2' : 'text-base mb-1',
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={clsx(
            'text-muted-foreground leading-relaxed max-w-[65ch]',
            secondaryText ? 'mb-2' : 'mb-4',
          )}
        >
          {description}
        </p>
      )}
      {secondaryText && (
        <p className='text-sm text-muted-foreground/75 leading-relaxed max-w-[65ch] mb-4'>
          {secondaryText}
        </p>
      )}
      {action}
    </div>
  );
}

import type { ReactNode } from 'react';
import { FileQuestion } from 'lucide-react';
import clsx from 'clsx';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className,
      )}
    >
      <div className='w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground'>
        {icon || <FileQuestion className='w-8 h-8' />}
      </div>
      <h3 className='text-lg font-semibold text-foreground mb-1'>{title}</h3>
      {description && <p className='text-muted-foreground max-w-sm mb-4'>{description}</p>}
      {action}
    </div>
  );
}

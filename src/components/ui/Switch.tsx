import clsx from 'clsx';
import { ButtonHTMLAttributes } from 'react';

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation(); // Stop propagation to prevent parent clicks
        onCheckedChange(!checked);
      }}
      className={clsx(
        'relative min-h-11 min-w-12 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
        checked ? 'border-primary bg-primary' : 'border-border bg-muted',
        className,
      )}
      {...props}
    >
      <div
        className={clsx(
          'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-primary-foreground shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1.5',
        )}
      />
    </button>
  );
}

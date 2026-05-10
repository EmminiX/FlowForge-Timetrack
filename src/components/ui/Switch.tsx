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
        'relative h-6 w-10 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
        checked ? 'border-primary bg-primary' : 'border-border bg-muted',
        className,
      )}
      {...props}
    >
      <div
        className={clsx(
          'absolute top-1 h-4 w-4 rounded-full bg-primary-foreground shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-1',
        )}
      />
    </button>
  );
}

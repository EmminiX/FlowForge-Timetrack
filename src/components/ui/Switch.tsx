import clsx from 'clsx';
import { ButtonHTMLAttributes } from 'react';

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}

export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation(); // Stop propagation to prevent parent clicks
                onCheckedChange(!checked);
            }}
            className={clsx(
                'w-10 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                checked ? 'bg-primary' : 'bg-muted',
                className
            )}
            {...props}
        >
            <div
                className={clsx(
                    'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow',
                    checked ? 'translate-x-5' : 'translate-x-1'
                )}
            />
        </button>
    );
}

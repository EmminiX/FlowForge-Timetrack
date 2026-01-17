import type { ReactNode, HTMLAttributes } from 'react';
import clsx from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
}

export function Card({ children, padding = 'md', hover = false, className, ...props }: CardProps) {
    const paddings = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    return (
        <div
            className={clsx(
                'bg-background border border-border rounded-xl',
                paddings[padding],
                hover && 'transition-shadow hover:shadow-md cursor-pointer',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={clsx('mb-4', className)}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <h3 className={clsx('text-lg font-semibold text-foreground', className)}>
            {children}
        </h3>
    );
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <p className={clsx('text-sm text-muted-foreground mt-1', className)}>
            {children}
        </p>
    );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={className}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={clsx('mt-4 pt-4 border-t border-border flex items-center gap-3', className)}>
            {children}
        </div>
    );
}

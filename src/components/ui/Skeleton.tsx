import clsx from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('shimmer rounded-lg', className)} />;
}

export function CardSkeleton() {
  return (
    <div className='p-4 bg-card border border-border rounded-xl space-y-3'>
      <Skeleton className='h-5 w-1/3' />
      <Skeleton className='h-4 w-2/3' />
      <Skeleton className='h-4 w-1/2' />
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className='space-y-3'>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

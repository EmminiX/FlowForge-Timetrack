import { Card } from '../../components/ui';
import { Wallet, Clock } from 'lucide-react';
import type { CurrencyAmount } from '../../services/dashboardService';

import { formatDuration } from '../../types';

interface QuickStatsProps {
  unbilledAmounts: CurrencyAmount[];
  billedAmounts: CurrencyAmount[];
  weeklySeconds: number;
  totalSeconds: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

function formatCurrencyAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' ';
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function mergeCurrencyAmounts(amounts: CurrencyAmount[]): CurrencyAmount[] {
  const buckets = new Map<string, number>();
  amounts.forEach(({ currency, amount }) => {
    buckets.set(currency, (buckets.get(currency) ?? 0) + amount);
  });
  return Array.from(buckets, ([currency, amount]) => ({ currency, amount }));
}

export function QuickStats({
  unbilledAmounts,
  billedAmounts,
  weeklySeconds,
  totalSeconds,
}: QuickStatsProps) {
  const mergedUnbilledAmounts = mergeCurrencyAmounts(unbilledAmounts);
  const mergedBilledAmounts = mergeCurrencyAmounts(billedAmounts);

  return (
    <Card className='p-4'>
      <h3 className='font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3'>
        Quick Stats
      </h3>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {/* Unbilled amounts by currency */}
        {mergedUnbilledAmounts.length > 0 ? (
          mergedUnbilledAmounts.map(({ currency, amount }) => (
            <div
              key={currency}
              className='flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3'
            >
              <div className='rounded-md border border-primary/25 bg-primary/10 p-2'>
                <Wallet className='w-5 h-5 text-primary' />
              </div>
              <div>
                <div className='text-lg font-bold'>{formatCurrencyAmount(amount, currency)}</div>
                <div className='text-xs text-muted-foreground'>
                  Unbilled {CURRENCY_SYMBOLS[currency] || currency}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className='flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3'>
            <div className='rounded-md border border-primary/25 bg-primary/10 p-2'>
              <Wallet className='w-5 h-5 text-primary' />
            </div>
            <div>
              <div className='text-lg font-bold'>€0.00</div>
              <div className='text-xs text-muted-foreground'>Unbilled</div>
            </div>
          </div>
        )}
        {/* Billed amounts by currency */}
        {mergedBilledAmounts.length > 0 ? (
          mergedBilledAmounts.map(({ currency, amount }) => (
            <div
              key={`billed-${currency}`}
              className='flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3'
            >
              <div className='rounded-md border border-accent/30 bg-accent/10 p-2'>
                <Wallet className='w-5 h-5 text-accent' />
              </div>
              <div>
                <div className='text-lg font-bold'>{formatCurrencyAmount(amount, currency)}</div>
                <div className='text-xs text-muted-foreground'>
                  Total Billed {CURRENCY_SYMBOLS[currency] || currency}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className='flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3'>
            <div className='rounded-md border border-accent/30 bg-accent/10 p-2'>
              <Wallet className='w-5 h-5 text-accent' />
            </div>
            <div>
              <div className='text-lg font-bold'>€0.00</div>
              <div className='text-xs text-muted-foreground'>Total Billed</div>
            </div>
          </div>
        )}

        {/* Weekly hours */}
        <div className='flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3'>
          <div className='rounded-md border border-border bg-[var(--surface-raised)] p-2'>
            <Clock className='w-5 h-5 text-muted-foreground' />
          </div>
          <div>
            <div className='text-lg font-bold'>{formatDuration(weeklySeconds)}</div>
            <div className='text-xs text-muted-foreground'>This Week</div>
          </div>
        </div>

        {/* Total hours */}
        <div className='flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3'>
          <div className='rounded-md border border-border bg-[var(--surface-raised)] p-2'>
            <Clock className='w-5 h-5 text-muted-foreground' />
          </div>
          <div>
            <div className='text-lg font-bold'>{formatDuration(totalSeconds)}</div>
            <div className='text-xs text-muted-foreground'>All Time</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

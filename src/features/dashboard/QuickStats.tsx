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

export function QuickStats({
  unbilledAmounts,
  billedAmounts,
  weeklySeconds,
  totalSeconds,
}: QuickStatsProps) {
  return (
    <Card className='p-4'>
      <h3 className='font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3'>
        Quick Stats
      </h3>

      <div className='flex flex-wrap gap-4'>
        {/* Unbilled amounts by currency */}
        {unbilledAmounts.length > 0 ? (
          unbilledAmounts.map(({ currency, amount }) => (
            <div key={currency} className='flex items-center gap-3'>
              <div className='p-2 rounded-lg bg-green-500/10'>
                <Wallet className='w-5 h-5 text-green-600 dark:text-green-400' />
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
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-green-500/10'>
              <Wallet className='w-5 h-5 text-green-600 dark:text-green-400' />
            </div>
            <div>
              <div className='text-lg font-bold'>€0.00</div>
              <div className='text-xs text-muted-foreground'>Unbilled</div>
            </div>
          </div>
        )}
        {/* Billed amounts by currency */}
        {billedAmounts.length > 0 ? (
          billedAmounts.map(({ currency, amount }) => (
            <div key={`billed-${currency}`} className='flex items-center gap-3'>
              <div className='p-2 rounded-lg bg-indigo-500/10'>
                <Wallet className='w-5 h-5 text-indigo-600 dark:text-indigo-400' />
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
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-indigo-500/10'>
              <Wallet className='w-5 h-5 text-indigo-600 dark:text-indigo-400' />
            </div>
            <div>
              <div className='text-lg font-bold'>€0.00</div>
              <div className='text-xs text-muted-foreground'>Total Billed</div>
            </div>
          </div>
        )}

        {/* Weekly hours */}
        <div className='flex items-center gap-3'>
          <div className='p-2 rounded-lg bg-blue-500/10'>
            <Clock className='w-5 h-5 text-blue-600 dark:text-blue-400' />
          </div>
          <div>
            <div className='text-lg font-bold'>{formatDuration(weeklySeconds)}</div>
            <div className='text-xs text-muted-foreground'>This Week</div>
          </div>
        </div>

        {/* Total hours */}
        <div className='flex items-center gap-3'>
          <div className='p-2 rounded-lg bg-purple-500/10'>
            <Clock className='w-5 h-5 text-purple-600 dark:text-purple-400' />
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

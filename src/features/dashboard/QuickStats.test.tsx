import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuickStats } from './QuickStats';

describe('QuickStats', () => {
  it('aggregates duplicate currency rows before rendering cards', () => {
    render(
      <QuickStats
        unbilledAmounts={[
          { currency: 'EUR', amount: 10 },
          { currency: 'EUR', amount: 5 },
        ]}
        billedAmounts={[
          { currency: 'EUR', amount: 20 },
          { currency: 'EUR', amount: 1 },
        ]}
        weeklySeconds={3600}
        totalSeconds={7200}
      />,
    );

    expect(screen.getByText('€15.00')).toBeInTheDocument();
    expect(screen.getByText('€21.00')).toBeInTheDocument();
    expect(screen.getAllByText('Unbilled €')).toHaveLength(1);
    expect(screen.getAllByText('Total Billed €')).toHaveLength(1);
  });
});

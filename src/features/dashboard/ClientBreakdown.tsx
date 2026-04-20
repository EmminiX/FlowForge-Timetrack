import type { ClientSummary } from '../../services/dashboardService';

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

function formatHours(seconds: number): string {
  const hours = seconds / 3600;
  return hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}h`;
}

function formatAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '€';
  return `${symbol}${amount.toFixed(2)}`;
}

interface ClientBreakdownProps {
  clients: ClientSummary[];
}

export function ClientBreakdown({ clients }: ClientBreakdownProps) {
  if (clients.length === 0) return null;

  return (
    <div className="bg-background border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Hours & Billing by Client</h3>
      <div className="space-y-3">
        {clients.map((client) => {
          const totalAmount = client.unbilledAmount + client.billedAmount;
          const billedPercent = totalAmount > 0 ? (client.billedAmount / totalAmount) * 100 : 0;

          return (
            <div key={client.clientId} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground truncate mr-2">
                  {client.clientName}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatHours(client.totalSeconds)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(billedPercent, 2)}%` }}
                  />
                </div>
                <div className="flex gap-2 text-xs whitespace-nowrap">
                  <span className="text-muted-foreground">
                    {formatAmount(client.unbilledAmount, client.currency)} unbilled
                  </span>
                  <span className="text-primary font-medium">
                    {formatAmount(client.billedAmount, client.currency)} billed
                  </span>
                  {client.downPaymentTotal > 0 && (
                    <span className="text-teal-600 dark:text-teal-400 font-medium">
                      {formatAmount(client.downPaymentTotal, client.currency)} deposits
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

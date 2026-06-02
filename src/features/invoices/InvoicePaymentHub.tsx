import { useEffect, useState } from 'react';
import { Bell, CheckCircle2, CreditCard, Send } from 'lucide-react';
import type {
  Currency,
  InvoiceEvent,
  InvoicePaymentMethod,
  InvoicePaymentSummary,
  InvoiceWithDetails,
} from '../../types';
import { invoicePaymentService } from '../../services';
import { Badge, Button, Card, CardContent, Input, Select, Textarea } from '../../components/ui';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function formatCurrency(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '€';
  return `${symbol}${amount.toFixed(2)}`;
}

function formatEventLabel(event: InvoiceEvent): string {
  const labels: Record<InvoiceEvent['eventType'], string> = {
    sent: 'Sent',
    viewed: 'Viewed',
    partial_payment: 'Partial payment',
    paid: 'Paid',
    reminder: 'Reminder',
  };
  return labels[event.eventType];
}

interface InvoicePaymentHubProps {
  invoice: InvoiceWithDetails;
  currency: Currency;
  onChanged?: () => void;
}

export function InvoicePaymentHub({ invoice, currency, onChanged }: InvoicePaymentHubProps) {
  const [summary, setSummary] = useState<InvoicePaymentSummary | null>(null);
  const [events, setEvents] = useState<InvoiceEvent[]>([]);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIsoDate());
  const [method, setMethod] = useState<InvoicePaymentMethod>('bank_transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const [nextSummary, nextEvents] = await Promise.all([
      invoicePaymentService.getSummary(invoice.id, invoice.total),
      invoicePaymentService.getEvents(invoice.id),
    ]);
    setSummary(nextSummary);
    setEvents(nextEvents);
    setAmount(nextSummary.balanceDue > 0 ? nextSummary.balanceDue.toFixed(2) : '');
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.id, invoice.total]);

  const handleRecordPayment = async () => {
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    setSaving(true);
    try {
      await invoicePaymentService.recordPayment(
        {
          invoiceId: invoice.id,
          amount: parsedAmount,
          paymentDate,
          method,
          reference,
          notes,
        },
        invoice.total,
      );
      setReference('');
      setNotes('');
      await loadData();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const handleSendReminder = async () => {
    setSaving(true);
    try {
      await invoicePaymentService.sendReminder(invoice.id);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className='space-y-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <h3 className='text-lg font-semibold text-foreground'>Payment Hub</h3>
            <p className='text-sm text-muted-foreground'>
              Track partial payments, reminders, and invoice activity.
            </p>
          </div>
          {summary?.isPaid ? (
            <Badge variant='success'>Paid in full</Badge>
          ) : (
            <Button variant='outline' size='sm' onClick={handleSendReminder} disabled={saving} className='gap-2'>
              <Send className='h-4 w-4' />
              Send reminder
            </Button>
          )}
        </div>

        <div className='grid gap-3 sm:grid-cols-3'>
          <div className='rounded-md border border-border p-3'>
            <p className='text-xs text-muted-foreground'>Paid</p>
            <p className='font-semibold text-foreground'>
              {formatCurrency(summary?.totalPaid ?? 0, currency)} paid
            </p>
          </div>
          <div className='rounded-md border border-border p-3'>
            <p className='text-xs text-muted-foreground'>Balance</p>
            <p className='font-semibold text-foreground'>
              {formatCurrency(summary?.balanceDue ?? invoice.total, currency)} due
            </p>
          </div>
          <div className='rounded-md border border-border p-3'>
            <p className='text-xs text-muted-foreground'>Invoice total</p>
            <p className='font-semibold text-foreground'>{formatCurrency(invoice.total, currency)}</p>
          </div>
        </div>

        {!summary?.isPaid && (
          <div className='grid gap-3 md:grid-cols-[1fr_1fr]'>
            <Input
              label='Payment amount'
              type='number'
              min={0}
              step={0.01}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <Input
              label='Payment date'
              type='date'
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
            />
            <Select
              label='Payment method'
              value={method}
              onChange={(event) => setMethod(event.target.value as InvoicePaymentMethod)}
              options={[
                { value: 'bank_transfer', label: 'Bank transfer' },
                { value: 'card', label: 'Card' },
                { value: 'cash', label: 'Cash' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Input
              label='Payment reference'
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder='Bank ref, Stripe ID, or note'
            />
            <div className='md:col-span-2'>
              <Textarea
                label='Payment notes'
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
              />
            </div>
            <div className='md:col-span-2'>
              <Button onClick={handleRecordPayment} loading={saving} className='gap-2'>
                <CreditCard className='h-4 w-4' />
                Record payment
              </Button>
            </div>
          </div>
        )}

        <div className='grid gap-4 md:grid-cols-2'>
          <div>
            <h4 className='mb-2 text-sm font-semibold text-foreground'>Payment history</h4>
            {summary?.payments.length ? (
              <div className='space-y-2'>
                {summary.payments.map((payment) => (
                  <div key={payment.id} className='rounded-md border border-border p-3'>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='font-medium text-foreground'>
                        {formatCurrency(payment.amount, currency)}
                      </span>
                      <span className='text-xs text-muted-foreground'>{payment.paymentDate}</span>
                    </div>
                    <p className='text-xs text-muted-foreground'>{payment.reference || payment.method}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>No payments recorded yet.</p>
            )}
          </div>

          <div>
            <h4 className='mb-2 text-sm font-semibold text-foreground'>Activity timeline</h4>
            {events.length ? (
              <div className='space-y-2'>
                {events.map((event) => (
                  <div key={event.id} className='rounded-md border border-border p-3'>
                    <div className='flex items-center gap-2'>
                      {event.eventType === 'paid' ? (
                        <CheckCircle2 className='h-4 w-4 text-primary' />
                      ) : (
                        <Bell className='h-4 w-4 text-muted-foreground' />
                      )}
                      <span className='text-sm font-medium text-foreground'>
                        {formatEventLabel(event)}
                      </span>
                    </div>
                    <p className='mt-1 text-xs text-muted-foreground'>{event.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>No invoice events yet.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

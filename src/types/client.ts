// Client data model

export type Currency = 'EUR' | 'USD' | 'GBP';

export const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
];

export interface Client {
  id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  vatNumber: string;
  hourlyRate: number;
  currency: Currency;
  notes: string;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

export interface ClientWithStats extends Client {
  totalHours: number;
  totalBillable: number;
  projectCount: number;
}

export type CreateClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateClientInput = Partial<CreateClientInput>;

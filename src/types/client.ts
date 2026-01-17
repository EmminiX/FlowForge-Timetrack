// Client data model

export interface Client {
  id: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  vatNumber: string;
  hourlyRate: number;
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

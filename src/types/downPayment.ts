// Down payment (deposit) tracking types

export interface DownPayment {
  id: string;
  clientId: string;
  projectId: string | null;
  amount: number;
  paymentDate: string; // ISO date
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DownPaymentWithDetails extends DownPayment {
  clientName: string;
  projectName: string | null;
}

export type CreateDownPaymentInput = Omit<DownPayment, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateDownPaymentInput = Partial<Omit<CreateDownPaymentInput, 'clientId'>>;

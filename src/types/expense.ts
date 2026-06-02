// Expense and receipt tracking types

export interface Expense {
  id: string;
  clientId: string;
  projectId: string | null;
  description: string;
  amount: number;
  expenseDate: string; // ISO date
  receiptPath: string | null;
  isBillable: boolean;
  isBilled: boolean;
  invoiceId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseWithDetails extends Expense {
  clientName: string;
  projectName: string | null;
}

export interface ExpenseFilters {
  clientId?: string;
  projectId?: string;
  isBillable?: boolean;
  isBilled?: boolean;
}

export type CreateExpenseInput = Omit<
  Expense,
  'id' | 'isBilled' | 'invoiceId' | 'createdAt' | 'updatedAt'
>;
export type UpdateExpenseInput = Partial<Omit<CreateExpenseInput, 'clientId'>>;

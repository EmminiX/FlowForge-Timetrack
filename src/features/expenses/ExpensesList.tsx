import { useEffect, useMemo, useState } from 'react';
import { Paperclip, Pencil, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import type { Client, CreateExpenseInput, ExpenseWithDetails, Project } from '../../types';
import { clientService, expenseService, projectService } from '../../services';
import { isTauriRuntime } from '../../lib/platform';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  ModalFooter,
  Select,
  Textarea,
} from '../../components/ui';

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function receiptFileName(path: string): string {
  return path.split('/').pop() || path;
}

async function chooseReceiptPath(): Promise<string | null> {
  if (!isTauriRuntime()) {
    return '/demo/receipts/attached-receipt.pdf';
  }

  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: 'Receipts',
        extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp'],
      },
    ],
  });

  if (!selected || Array.isArray(selected)) return null;
  return selected;
}

export function ExpensesList() {
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseWithDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expenseData, clientData, projectData] = await Promise.all([
        expenseService.getAll(),
        clientService.getAll(),
        projectService.getAll(),
      ]);
      setExpenses(expenseData);
      setClients(clientData);
      setProjects(projectData);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return expenses;
    return expenses.filter(
      (expense) =>
        expense.description.toLowerCase().includes(query) ||
        expense.clientName.toLowerCase().includes(query) ||
        expense.projectName?.toLowerCase().includes(query),
    );
  }, [expenses, searchQuery]);

  const handleCreate = async (input: CreateExpenseInput) => {
    setSubmitting(true);
    try {
      await expenseService.create(input);
      await loadData();
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (input: CreateExpenseInput) => {
    if (!editingExpense) return;
    setSubmitting(true);
    try {
      await expenseService.update(editingExpense.id, input);
      await loadData();
      setEditingExpense(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;
    setSubmitting(true);
    try {
      await expenseService.delete(deletingExpense.id);
      await loadData();
      setDeletingExpense(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-primary' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-foreground'>Expenses</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className='h-4 w-4' />
          New Expense
        </Button>
      </div>

      {expenses.length > 0 && (
        <div className='relative max-w-md'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder='Search expenses...'
            aria-label='Search expenses'
            className='pl-9'
          />
        </div>
      )}

      {expenses.length === 0 ? (
        <EmptyState
          icon={<Receipt className='h-8 w-8' />}
          variant='guided'
          title='No expenses yet'
          description='Track billable expenses and attach receipts for invoice-ready records.'
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className='h-4 w-4' />
              Add Expense
            </Button>
          }
        />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          icon={<Search className='h-8 w-8' />}
          variant='minimal'
          title='No matching expenses'
          description='Try a different search.'
        />
      ) : (
        <div className='grid gap-4 lg:grid-cols-2'>
          {filteredExpenses.map((expense) => (
            <Card key={expense.id} className='p-4'>
              <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h2 className='truncate text-base font-semibold text-foreground'>
                      {expense.description}
                    </h2>
                    <Badge variant={expense.isBilled ? 'success' : 'warning'}>
                      {expense.isBilled ? 'Billed' : expense.isBillable ? 'Billable' : 'Internal'}
                    </Badge>
                  </div>
                  <div className='mt-1 text-sm text-muted-foreground'>
                    {expense.clientName}
                    {expense.projectName ? ` · ${expense.projectName}` : ''}
                  </div>
                  {expense.receiptPath && (
                    <div className='mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                      <span className='inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1'>
                        <Paperclip className='h-3.5 w-3.5' />
                        Receipt attached
                      </span>
                      <span className='truncate'>{receiptFileName(expense.receiptPath)}</span>
                    </div>
                  )}
                </div>
                <div className='text-right'>
                  <div className='font-mono text-lg font-semibold text-foreground'>
                    {formatCurrency(expense.amount)}
                  </div>
                  <div className='text-xs text-muted-foreground'>{expense.expenseDate}</div>
                </div>
              </div>

              <div className='mt-4 flex justify-end gap-2 border-t border-border pt-3'>
                <Button variant='ghost' size='sm' onClick={() => setEditingExpense(expense)}>
                  <Pencil className='h-4 w-4' />
                </Button>
                <Button variant='ghost' size='sm' onClick={() => setDeletingExpense(expense)}>
                  <Trash2 className='h-4 w-4 text-destructive' />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(showForm || editingExpense) && (
        <ExpenseFormModal
          isOpen={showForm || !!editingExpense}
          onClose={() => {
            setShowForm(false);
            setEditingExpense(null);
          }}
          onSubmit={editingExpense ? handleUpdate : handleCreate}
          initialData={editingExpense}
          clients={clients}
          projects={projects}
          loading={submitting}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={handleDelete}
        title='Delete Expense'
        message={`Delete "${deletingExpense?.description}"?`}
        confirmLabel='Delete'
        variant='danger'
        loading={submitting}
      />
    </div>
  );
}

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateExpenseInput) => Promise<void>;
  initialData: ExpenseWithDetails | null;
  clients: Client[];
  projects: Project[];
  loading: boolean;
}

function ExpenseFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  clients,
  projects,
  loading,
}: ExpenseFormModalProps) {
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [expenseDate, setExpenseDate] = useState(todayIsoDate());
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [isBillable, setIsBillable] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setClientId(initialData?.clientId || clients[0]?.id || '');
      setProjectId(initialData?.projectId || '');
      setDescription(initialData?.description || '');
      setAmount(initialData?.amount || 0);
      setExpenseDate(initialData?.expenseDate || todayIsoDate());
      setReceiptPath(initialData?.receiptPath || null);
      setIsBillable(initialData?.isBillable ?? true);
      setNotes(initialData?.notes || '');
      setError(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [clients, initialData, isOpen]);

  const projectOptions = [
    { value: '', label: 'No project' },
    ...projects
      .filter((project) => !clientId || project.clientId === clientId)
      .map((project) => ({ value: project.id, label: project.name })),
  ];

  const handleAttachReceipt = async () => {
    const selected = await chooseReceiptPath();
    if (selected) {
      setReceiptPath(selected);
    }
  };

  const handleSubmit = async () => {
    if (!clientId || !description.trim() || amount <= 0) {
      setError('Client, description, and amount are required.');
      return;
    }

    await onSubmit({
      clientId,
      projectId: projectId || null,
      description: description.trim(),
      amount,
      expenseDate,
      receiptPath,
      isBillable,
      notes,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Expense' : 'New Expense'}
      size='lg'
    >
      <div className='space-y-4'>
        {error && (
          <div className='rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive'>
            {error}
          </div>
        )}

        <div className='grid gap-4 sm:grid-cols-2'>
          <Select
            label='Client'
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
              setProjectId('');
            }}
            options={clients.map((client) => ({ value: client.id, label: client.name }))}
          />
          <Select
            label='Project'
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            options={projectOptions}
          />
        </div>

        <Input
          label='Description *'
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder='Receipt, license, travel, hosting...'
        />

        <div className='grid gap-4 sm:grid-cols-2'>
          <Input
            label='Amount *'
            type='number'
            min='0'
            step='0.01'
            value={amount || ''}
            onChange={(event) => setAmount(Number(event.target.value) || 0)}
          />
          <Input
            label='Date'
            type='date'
            value={expenseDate}
            onChange={(event) => setExpenseDate(event.target.value)}
          />
        </div>

        <div className='rounded-md border border-border bg-muted/20 p-3'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='min-w-0'>
              <div className='text-sm font-medium text-foreground'>Receipt</div>
              <div className='truncate text-xs text-muted-foreground'>
                {receiptPath ? receiptFileName(receiptPath) : 'No receipt attached'}
              </div>
            </div>
            <Button type='button' variant='outline' onClick={handleAttachReceipt}>
              <Paperclip className='h-4 w-4' />
              Attach receipt
            </Button>
          </div>
        </div>

        <label className='flex min-h-11 items-center gap-3 rounded-md border border-border bg-muted/20 px-3 text-sm text-foreground'>
          <input
            type='checkbox'
            checked={isBillable}
            onChange={(event) => setIsBillable(event.target.checked)}
            className='h-4 w-4'
          />
          Pull this expense into invoices
        </label>

        <Textarea
          label='Notes'
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder='Internal note'
          rows={2}
        />

        <ModalFooter>
          <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type='button' onClick={handleSubmit} loading={loading}>
            {initialData ? 'Save Changes' : 'Create Expense'}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

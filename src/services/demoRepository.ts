import type { AppSettings } from '../types/settings';
import type {
  ActivityTimelineEvent,
  ActivityTimelineEventWithProject,
  ActivityTimelineFilters,
  CreateActivityTimelineEventInput,
  TimelineSuggestion,
} from '../types/activityTimeline';
import type {
  Client,
  ClientWithStats,
  CreateClientInput,
  UpdateClientInput,
} from '../types/client';
import type {
  CreateDownPaymentInput,
  DownPayment,
  DownPaymentWithDetails,
  UpdateDownPaymentInput,
} from '../types/downPayment';
import type {
  CreateExpenseInput,
  Expense,
  ExpenseFilters,
  ExpenseWithDetails,
  UpdateExpenseInput,
} from '../types/expense';
import type {
  CreateInvoiceInput,
  CreateInvoiceEventInput,
  CreateInvoicePaymentInput,
  CreateLineItemInput,
  Invoice,
  InvoiceEvent,
  InvoiceLineItem,
  InvoicePayment,
  InvoicePaymentSummary,
  InvoiceStatus,
  InvoiceWithDetails,
  UpdateInvoiceInput,
} from '../types/invoice';
import { calculateInvoiceTotals } from '../types/invoice';
import type { CreateProductInput, Product, UpdateProductInput } from '../types/product';
import type {
  CreateProjectInput,
  Project,
  ProjectWithStats,
  UpdateProjectInput,
} from '../types/project';
import { calculateProjectBudgetStatus } from '../types/project';
import type {
  CreateTimeEntryInput,
  TimeEntry,
  TimeEntryWithProject,
  UpdateTimeEntryInput,
} from '../types/timeEntry';
import type { DashboardData, DaySummary } from './dashboardService';
import type { TimeEntryFilters } from './timeEntryService';
import { buildTimelineSuggestions } from '../features/activity-timeline/timelineUtils';
import { createDemoSeedData } from './demoData';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

function durationSeconds(entry: TimeEntry, referenceDate = new Date()): number {
  const start = new Date(entry.startTime).getTime();
  const end = entry.endTime ? new Date(entry.endTime).getTime() : referenceDate.getTime();
  return Math.max(0, Math.floor((end - start) / 1000) - entry.pauseDuration);
}

function sameDate(isoDateTime: string, date: Date): boolean {
  return isoDateTime.split('T')[0] === date.toISOString().split('T')[0];
}

function dayName(date: Date): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
}

export function createDemoRepository(seed = createDemoSeedData()) {
  const state = clone(seed);

  function projectFor(entry: TimeEntry): Project | undefined {
    return state.projects.find((project) => project.id === entry.projectId);
  }

  function clientForProject(project: Project | undefined): Client | undefined {
    return project?.clientId
      ? state.clients.find((client) => client.id === project.clientId)
      : undefined;
  }

  function toTimeEntryWithProject(entry: TimeEntry): TimeEntryWithProject {
    const project = projectFor(entry);
    const client = clientForProject(project);
    return {
      ...entry,
      projectName: project?.name ?? 'Unknown project',
      projectColor: project?.color ?? '#6366f1',
      clientId: client?.id ?? null,
      clientName: client?.name ?? null,
    };
  }

  function filteredEntries(filters?: TimeEntryFilters): TimeEntryWithProject[] {
    return state.timeEntries
      .map(toTimeEntryWithProject)
      .filter((entry) => {
        if (filters?.projectId && entry.projectId !== filters.projectId) return false;
        if (filters?.clientId && entry.clientId !== filters.clientId) return false;
        if (filters?.startDate && entry.startTime < filters.startDate) return false;
        if (filters?.endDate && entry.startTime > filters.endDate) return false;
        if (filters?.isBillable !== undefined && entry.isBillable !== filters.isBillable)
          return false;
        if (filters?.isBilled !== undefined && entry.isBilled !== filters.isBilled) return false;
        return true;
      })
      .sort((a, b) => b.startTime.localeCompare(a.startTime));
  }

  function invoiceDetails(invoice: Invoice): InvoiceWithDetails {
    const client = state.clients.find((item) => item.id === invoice.clientId);
    const lineItems = state.invoiceLineItems.filter((item) => item.invoiceId === invoice.id);
    const totals = calculateInvoiceTotals(lineItems, invoice.taxRate, invoice.downPayment);
    return {
      ...invoice,
      clientName: client?.name ?? 'Unknown client',
      clientEmail: client?.email ?? '',
      clientPhone: client?.phone ?? '',
      clientAddress: client?.address ?? '',
      clientVatNumber: client?.vatNumber ?? '',
      lineItems: clone(lineItems),
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
    };
  }

  function clientStats(client: Client): ClientWithStats {
    const clientProjects = state.projects.filter((project) => project.clientId === client.id);
    const projectIds = new Set(clientProjects.map((project) => project.id));
    const entries = state.timeEntries.filter((entry) => projectIds.has(entry.projectId));
    const totalSeconds = entries.reduce((sum, entry) => sum + durationSeconds(entry), 0);
    const totalBillable = entries
      .filter((entry) => entry.isBillable)
      .reduce((sum, entry) => sum + (durationSeconds(entry) / 3600) * client.hourlyRate, 0);

    return {
      ...client,
      totalHours: totalSeconds / 3600,
      totalBillable,
      projectCount: clientProjects.length,
    };
  }

  function projectStats(project: Project): ProjectWithStats {
    const client = clientForProject(project);
    const entries = state.timeEntries.filter((entry) => entry.projectId === project.id);
    const totalSeconds = entries.reduce((sum, entry) => sum + durationSeconds(entry), 0);
    const totalBillable = entries
      .filter((entry) => entry.isBillable)
      .reduce((sum, entry) => sum + (durationSeconds(entry) / 3600) * (client?.hourlyRate ?? 0), 0);

    const baseStats = {
      ...project,
      clientName: client?.name ?? null,
      totalHours: totalSeconds / 3600,
      totalBillable,
    };

    return {
      ...baseStats,
      ...calculateProjectBudgetStatus(baseStats),
    };
  }

  function downPaymentDetails(downPayment: DownPayment): DownPaymentWithDetails {
    const client = state.clients.find((item) => item.id === downPayment.clientId);
    const project = downPayment.projectId
      ? state.projects.find((item) => item.id === downPayment.projectId)
      : undefined;

    return {
      ...downPayment,
      clientName: client?.name ?? 'Unknown client',
      projectName: project?.name ?? null,
    };
  }

  function expenseDetails(expense: Expense): ExpenseWithDetails {
    const client = state.clients.find((item) => item.id === expense.clientId);
    const project = expense.projectId
      ? state.projects.find((item) => item.id === expense.projectId)
      : undefined;

    return {
      ...expense,
      clientName: client?.name ?? 'Unknown client',
      projectName: project?.name ?? null,
    };
  }

  function filteredExpenses(filters: ExpenseFilters = {}): ExpenseWithDetails[] {
    return state.expenses
      .map(expenseDetails)
      .filter((expense) => {
        if (filters.clientId && expense.clientId !== filters.clientId) return false;
        if (filters.projectId && expense.projectId !== filters.projectId) return false;
        if (filters.isBillable !== undefined && expense.isBillable !== filters.isBillable)
          return false;
        if (filters.isBilled !== undefined && expense.isBilled !== filters.isBilled) return false;
        return true;
      })
      .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
  }

  function timelineDetails(event: ActivityTimelineEvent): ActivityTimelineEventWithProject {
    const project = event.projectId
      ? state.projects.find((item) => item.id === event.projectId)
      : undefined;

    return {
      ...event,
      projectName: project?.name ?? null,
      projectColor: project?.color ?? null,
    };
  }

  function filteredTimelineEvents(
    filters: ActivityTimelineFilters = {},
  ): ActivityTimelineEventWithProject[] {
    return state.activityTimeline
      .map(timelineDetails)
      .filter((event) => {
        if (filters.startDate && event.startedAt < filters.startDate) return false;
        if (filters.endDate && event.startedAt > filters.endDate) return false;
        if (!filters.includeDismissed && event.isDismissed) return false;
        return true;
      })
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  const repository = {
    clients: {
      async getAll(): Promise<Client[]> {
        return clone(state.clients).sort((a, b) => a.name.localeCompare(b.name));
      },
      async getAllWithStats(): Promise<ClientWithStats[]> {
        return clone(state.clients.map(clientStats)).sort((a, b) => a.name.localeCompare(b.name));
      },
      async getById(id: string): Promise<Client | null> {
        return clone(state.clients.find((client) => client.id === id) ?? null);
      },
      async create(input: CreateClientInput): Promise<Client> {
        const timestamp = now();
        const client: Client = {
          id: createId('demo-client'),
          ...input,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        state.clients.push(client);
        return clone(client);
      },
      async update(id: string, input: UpdateClientInput): Promise<Client | null> {
        const index = state.clients.findIndex((client) => client.id === id);
        if (index === -1) return null;
        state.clients[index] = { ...state.clients[index], ...input, updatedAt: now() };
        return clone(state.clients[index]);
      },
      async delete(id: string): Promise<boolean> {
        const before = state.clients.length;
        state.clients = state.clients.filter((client) => client.id !== id);
        return state.clients.length !== before;
      },
    },

    projects: {
      async getAll(): Promise<Project[]> {
        return clone(state.projects).sort((a, b) => a.name.localeCompare(b.name));
      },
      async getAllWithStats(): Promise<ProjectWithStats[]> {
        return clone(state.projects.map(projectStats)).sort((a, b) => a.name.localeCompare(b.name));
      },
      async getByClientId(clientId: string): Promise<Project[]> {
        return clone(state.projects.filter((project) => project.clientId === clientId));
      },
      async getActive(): Promise<Project[]> {
        return clone(state.projects.filter((project) => project.status === 'active'));
      },
      async getById(id: string): Promise<Project | null> {
        return clone(state.projects.find((project) => project.id === id) ?? null);
      },
      async create(input: CreateProjectInput): Promise<Project> {
        const timestamp = now();
        const project: Project = {
          id: createId('demo-project'),
          ...input,
          clientId: input.clientId ?? null,
          budgetType: input.budgetType ?? 'none',
          budgetHours: input.budgetHours ?? 0,
          budgetAmount: input.budgetAmount ?? 0,
          budgetAlertThreshold: input.budgetAlertThreshold ?? 0.8,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        state.projects.push(project);
        return clone(project);
      },
      async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
        const index = state.projects.findIndex((project) => project.id === id);
        if (index === -1) return null;
        state.projects[index] = { ...state.projects[index], ...input, updatedAt: now() };
        return clone(state.projects[index]);
      },
      async delete(id: string): Promise<boolean> {
        const before = state.projects.length;
        state.projects = state.projects.filter((project) => project.id !== id);
        return state.projects.length !== before;
      },
    },

    timeEntries: {
      async getAll(filters?: TimeEntryFilters): Promise<TimeEntryWithProject[]> {
        return clone(filteredEntries(filters));
      },
      async getRunning(): Promise<TimeEntryWithProject | null> {
        const entry = state.timeEntries.find((item) => item.endTime === null);
        return entry ? clone(toTimeEntryWithProject(entry)) : null;
      },
      async getUnbilledByProject(projectId: string): Promise<TimeEntry[]> {
        return clone(
          state.timeEntries.filter(
            (entry) =>
              entry.projectId === projectId &&
              entry.isBillable &&
              !entry.isBilled &&
              entry.endTime !== null,
          ),
        );
      },
      async getById(id: string): Promise<TimeEntry | null> {
        return clone(state.timeEntries.find((entry) => entry.id === id) ?? null);
      },
      async create(input: CreateTimeEntryInput): Promise<TimeEntry> {
        const entry: TimeEntry = {
          id: createId('demo-time'),
          ...input,
          endTime: input.endTime ?? null,
          pauseDuration: input.pauseDuration ?? 0,
          notes: input.notes ?? '',
          isBillable: input.isBillable ?? true,
          isBilled: input.isBilled ?? false,
          createdAt: now(),
        };
        state.timeEntries.push(entry);
        return clone(entry);
      },
      async update(id: string, input: UpdateTimeEntryInput): Promise<TimeEntry | null> {
        const index = state.timeEntries.findIndex((entry) => entry.id === id);
        if (index === -1) return null;
        state.timeEntries[index] = { ...state.timeEntries[index], ...input };
        return clone(state.timeEntries[index]);
      },
      async markAsBilled(ids: string[]): Promise<void> {
        state.timeEntries = state.timeEntries.map((entry) =>
          ids.includes(entry.id) ? { ...entry, isBilled: true } : entry,
        );
      },
      async markAsUnbilled(ids: string[]): Promise<void> {
        state.timeEntries = state.timeEntries.map((entry) =>
          ids.includes(entry.id) ? { ...entry, isBilled: false } : entry,
        );
      },
      async delete(id: string): Promise<boolean> {
        const before = state.timeEntries.length;
        state.timeEntries = state.timeEntries.filter((entry) => entry.id !== id);
        return state.timeEntries.length !== before;
      },
      async deleteMany(ids: string[]): Promise<void> {
        state.timeEntries = state.timeEntries.filter((entry) => !ids.includes(entry.id));
      },
      async bulkDelete(ids: string[]): Promise<void> {
        await repository.timeEntries.deleteMany(ids);
      },
      async bulkUpdateBillable(ids: string[], isBillable: boolean): Promise<void> {
        state.timeEntries = state.timeEntries.map((entry) =>
          ids.includes(entry.id) ? { ...entry, isBillable } : entry,
        );
      },
      async bulkUpdateBilled(ids: string[], isBilled: boolean): Promise<void> {
        state.timeEntries = state.timeEntries.map((entry) =>
          ids.includes(entry.id) ? { ...entry, isBilled } : entry,
        );
      },
    },

    downPayments: {
      async getAll(): Promise<DownPaymentWithDetails[]> {
        return clone(state.downPayments.map(downPaymentDetails)).sort((a, b) =>
          b.paymentDate.localeCompare(a.paymentDate),
        );
      },
      async getByClientId(clientId: string): Promise<DownPaymentWithDetails[]> {
        return clone(
          state.downPayments
            .filter((payment) => payment.clientId === clientId)
            .map(downPaymentDetails)
            .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)),
        );
      },
      async getTotalByClientId(clientId: string): Promise<number> {
        return state.downPayments
          .filter((payment) => payment.clientId === clientId)
          .reduce((sum, payment) => sum + payment.amount, 0);
      },
      async getById(id: string): Promise<DownPaymentWithDetails | null> {
        const payment = state.downPayments.find((item) => item.id === id);
        return payment ? clone(downPaymentDetails(payment)) : null;
      },
      async create(input: CreateDownPaymentInput): Promise<DownPayment> {
        const timestamp = now();
        const payment: DownPayment = {
          id: createId('demo-down-payment'),
          ...input,
          projectId: input.projectId ?? null,
          notes: input.notes ?? '',
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        state.downPayments.push(payment);
        return clone(payment);
      },
      async update(id: string, input: UpdateDownPaymentInput): Promise<DownPayment | null> {
        const index = state.downPayments.findIndex((payment) => payment.id === id);
        if (index === -1) return null;
        state.downPayments[index] = {
          ...state.downPayments[index],
          ...input,
          projectId: input.projectId ?? state.downPayments[index].projectId,
          updatedAt: now(),
        };
        return clone(state.downPayments[index]);
      },
      async delete(id: string): Promise<boolean> {
        const before = state.downPayments.length;
        state.downPayments = state.downPayments.filter((payment) => payment.id !== id);
        return state.downPayments.length !== before;
      },
    },

    expenses: {
      async getAll(filters: ExpenseFilters = {}): Promise<ExpenseWithDetails[]> {
        return clone(filteredExpenses(filters));
      },
      async getUnbilledByClientId(clientId: string): Promise<ExpenseWithDetails[]> {
        return clone(
          filteredExpenses({
            clientId,
            isBillable: true,
            isBilled: false,
          }).sort((a, b) => a.expenseDate.localeCompare(b.expenseDate)),
        );
      },
      async getById(id: string): Promise<ExpenseWithDetails | null> {
        const expense = state.expenses.find((item) => item.id === id);
        return expense ? clone(expenseDetails(expense)) : null;
      },
      async create(input: CreateExpenseInput): Promise<Expense> {
        const timestamp = now();
        const expense: Expense = {
          id: createId('demo-expense'),
          ...input,
          projectId: input.projectId ?? null,
          receiptPath: input.receiptPath ?? null,
          isBilled: false,
          invoiceId: null,
          notes: input.notes ?? '',
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        state.expenses.push(expense);
        return clone(expense);
      },
      async update(id: string, input: UpdateExpenseInput): Promise<Expense | null> {
        const index = state.expenses.findIndex((expense) => expense.id === id);
        if (index === -1) return null;
        state.expenses[index] = {
          ...state.expenses[index],
          ...input,
          projectId:
            input.projectId === undefined
              ? state.expenses[index].projectId
              : (input.projectId ?? null),
          receiptPath:
            input.receiptPath === undefined
              ? state.expenses[index].receiptPath
              : (input.receiptPath ?? null),
          updatedAt: now(),
        };
        return clone(state.expenses[index]);
      },
      async markAsBilled(ids: string[], invoiceId: string): Promise<void> {
        state.expenses = state.expenses.map((expense) =>
          ids.includes(expense.id) ? { ...expense, isBilled: true, invoiceId } : expense,
        );
      },
      async delete(id: string): Promise<boolean> {
        const before = state.expenses.length;
        state.expenses = state.expenses.filter((expense) => expense.id !== id);
        return state.expenses.length !== before;
      },
    },

    activityTimeline: {
      async getRecent(
        filters: ActivityTimelineFilters = {},
      ): Promise<ActivityTimelineEventWithProject[]> {
        return clone(filteredTimelineEvents(filters));
      },
      async getSuggestions(options?: {
        minDurationSeconds?: number;
      }): Promise<TimelineSuggestion[]> {
        return clone(
          buildTimelineSuggestions(filteredTimelineEvents({ includeDismissed: false }), options),
        );
      },
      async recordEvent(input: CreateActivityTimelineEventInput): Promise<ActivityTimelineEvent> {
        const durationSeconds = Math.max(
          0,
          Math.round(
            (new Date(input.endedAt).getTime() - new Date(input.startedAt).getTime()) / 1000,
          ),
        );
        const event: ActivityTimelineEvent = {
          id: createId('demo-timeline'),
          eventType: input.eventType,
          appName: input.appName,
          windowTitle: input.windowTitle ?? null,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          durationSeconds,
          source: input.source ?? 'demo',
          projectId: input.projectId ?? null,
          timeEntryId: null,
          notes: input.notes ?? '',
          isDismissed: false,
          createdAt: now(),
        };
        state.activityTimeline.push(event);
        return clone(event);
      },
      async recordIdleGap(input: {
        startedAt: string;
        endedAt: string;
      }): Promise<ActivityTimelineEvent> {
        return this.recordEvent({
          eventType: 'idle',
          appName: 'Idle',
          windowTitle: null,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          source: 'demo',
          notes: 'Idle gap detected locally',
        });
      },
      async linkTimeEntry(eventIds: string[], timeEntryId: string): Promise<void> {
        state.activityTimeline = state.activityTimeline.map((event) =>
          eventIds.includes(event.id) ? { ...event, timeEntryId } : event,
        );
      },
      async dismiss(eventIds: string[]): Promise<void> {
        state.activityTimeline = state.activityTimeline.map((event) =>
          eventIds.includes(event.id) ? { ...event, isDismissed: true } : event,
        );
      },
    },

    invoices: {
      async getAll(status?: string): Promise<InvoiceWithDetails[]> {
        const invoices = status
          ? state.invoices.filter((invoice) => invoice.status === status)
          : state.invoices;
        return clone(invoices.map(invoiceDetails));
      },
      async getById(id: string): Promise<InvoiceWithDetails | null> {
        const invoice = state.invoices.find((item) => item.id === id);
        return invoice ? clone(invoiceDetails(invoice)) : null;
      },
      async getLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
        return clone(state.invoiceLineItems.filter((item) => item.invoiceId === invoiceId));
      },
      async create(input: CreateInvoiceInput, lineItems: CreateLineItemInput[]): Promise<Invoice> {
        const timestamp = now();
        const invoice: Invoice = {
          id: createId('demo-invoice'),
          ...input,
          status: input.status ?? 'draft',
          notes: input.notes ?? '',
          taxRate: input.taxRate ?? 0,
          downPayment: input.downPayment ?? 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        state.invoices.push(invoice);
        state.invoiceLineItems.push(
          ...lineItems.map((item) => ({
            id: createId('demo-line'),
            ...item,
            invoiceId: invoice.id,
          })),
        );
        return clone(invoice);
      },
      async update(id: string, input: UpdateInvoiceInput): Promise<Invoice | null> {
        const index = state.invoices.findIndex((invoice) => invoice.id === id);
        if (index === -1) return null;
        state.invoices[index] = {
          ...state.invoices[index],
          ...input,
          status: (input.status ?? state.invoices[index].status) as InvoiceStatus,
          updatedAt: now(),
        };
        return clone(state.invoices[index]);
      },
      async addLineItem(
        input: CreateLineItemInput & { invoiceId: string },
      ): Promise<InvoiceLineItem> {
        const item: InvoiceLineItem = { id: createId('demo-line'), ...input };
        state.invoiceLineItems.push(item);
        return clone(item);
      },
      async deleteLineItem(id: string): Promise<void> {
        state.invoiceLineItems = state.invoiceLineItems.filter((item) => item.id !== id);
      },
      async replaceLineItems(invoiceId: string, lineItems: CreateLineItemInput[]): Promise<void> {
        state.invoiceLineItems = state.invoiceLineItems.filter(
          (item) => item.invoiceId !== invoiceId,
        );
        state.invoiceLineItems.push(
          ...lineItems.map((item) => ({
            id: createId('demo-line'),
            ...item,
            invoiceId,
          })),
        );
      },
      async delete(id: string): Promise<boolean> {
        const before = state.invoices.length;
        state.invoices = state.invoices.filter((invoice) => invoice.id !== id);
        state.invoiceLineItems = state.invoiceLineItems.filter((item) => item.invoiceId !== id);
        return state.invoices.length !== before;
      },
      async getAllForNumbering(): Promise<Invoice[]> {
        return clone(state.invoices);
      },
    },

    invoicePayments: {
      async getPayments(invoiceId: string): Promise<InvoicePayment[]> {
        return clone(
          state.invoicePayments
            .filter((payment) => payment.invoiceId === invoiceId)
            .sort(
              (a, b) =>
                b.paymentDate.localeCompare(a.paymentDate) ||
                b.createdAt.localeCompare(a.createdAt),
            ),
        );
      },
      async getEvents(invoiceId: string): Promise<InvoiceEvent[]> {
        return clone(
          state.invoiceEvents
            .filter((event) => event.invoiceId === invoiceId)
            .sort(
              (a, b) =>
                b.eventDate.localeCompare(a.eventDate) || b.createdAt.localeCompare(a.createdAt),
            ),
        );
      },
      async getSummary(invoiceId: string, invoiceTotal: number): Promise<InvoicePaymentSummary> {
        const payments = await this.getPayments(invoiceId);
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const balanceDue = Math.max(0, invoiceTotal - totalPaid);
        return {
          payments,
          totalPaid,
          balanceDue,
          isPaid: balanceDue <= 0,
        };
      },
      async recordEvent(input: CreateInvoiceEventInput): Promise<InvoiceEvent> {
        const event: InvoiceEvent = {
          id: createId('demo-invoice-event'),
          ...input,
          message: input.message ?? '',
          createdAt: now(),
        };
        state.invoiceEvents.push(event);
        return clone(event);
      },
      async sendReminder(invoiceId: string): Promise<InvoiceEvent> {
        return this.recordEvent({
          invoiceId,
          eventType: 'reminder',
          eventDate: now(),
          message: 'Reminder sent',
        });
      },
      async recordPayment(
        input: CreateInvoicePaymentInput,
        invoiceTotal: number,
      ): Promise<InvoicePayment> {
        const payment: InvoicePayment = {
          id: createId('demo-payment'),
          ...input,
          reference: input.reference ?? '',
          notes: input.notes ?? '',
          createdAt: now(),
        };
        state.invoicePayments.push(payment);

        const totalPaid = state.invoicePayments
          .filter((item) => item.invoiceId === input.invoiceId)
          .reduce((sum, item) => sum + item.amount, 0);
        const paidInFull = totalPaid >= invoiceTotal;

        await this.recordEvent({
          invoiceId: input.invoiceId,
          eventType: paidInFull ? 'paid' : 'partial_payment',
          eventDate: now(),
          message: paidInFull ? 'Invoice paid' : `Payment recorded: ${input.amount.toFixed(2)}`,
        });

        if (paidInFull) {
          state.invoices = state.invoices.map((invoice) =>
            invoice.id === input.invoiceId
              ? { ...invoice, status: 'paid', updatedAt: now() }
              : invoice,
          );
        }

        return clone(payment);
      },
    },

    products: {
      async getAll(): Promise<Product[]> {
        return clone(state.products).sort((a, b) => a.name.localeCompare(b.name));
      },
      async getById(id: string): Promise<Product | null> {
        return clone(state.products.find((product) => product.id === id) ?? null);
      },
      async create(input: CreateProductInput): Promise<Product> {
        const timestamp = now();
        const product: Product = {
          id: createId('demo-product'),
          ...input,
          description: input.description ?? '',
          sku: input.sku ?? '',
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        state.products.push(product);
        return clone(product);
      },
      async update(id: string, input: UpdateProductInput): Promise<Product | null> {
        const index = state.products.findIndex((product) => product.id === id);
        if (index === -1) return null;
        state.products[index] = { ...state.products[index], ...input, updatedAt: now() };
        return clone(state.products[index]);
      },
      async delete(id: string): Promise<boolean> {
        const before = state.products.length;
        state.products = state.products.filter((product) => product.id !== id);
        return state.products.length !== before;
      },
    },

    settings: {
      async load(): Promise<AppSettings> {
        return clone(state.settings);
      },
      async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
        state.settings[key] = value;
      },
      async setMany(settings: Partial<AppSettings>): Promise<void> {
        state.settings = { ...state.settings, ...settings };
      },
      async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
        return clone(state.settings[key]);
      },
      async reset(): Promise<void> {
        state.settings = clone(seed.settings);
      },
    },

    dashboard: {
      async getDashboardData(): Promise<DashboardData> {
        const entries = filteredEntries();
        const todayDate = new Date();
        const todayEntries = entries.filter((entry) => sameDate(entry.startTime, todayDate));
        const projectTotals = new Map<string, number>();
        const clientTotals = new Map<string, number>();

        for (const entry of entries) {
          const seconds = durationSeconds(entry);
          projectTotals.set(entry.projectId, (projectTotals.get(entry.projectId) ?? 0) + seconds);
          if (entry.clientId) {
            clientTotals.set(entry.clientId, (clientTotals.get(entry.clientId) ?? 0) + seconds);
          }
        }

        const weekDays: DaySummary[] = Array.from({ length: 7 }, (_, index) => {
          const date = new Date(todayDate);
          date.setDate(todayDate.getDate() - (6 - index));
          const totalSeconds = entries
            .filter((entry) => sameDate(entry.startTime, date))
            .reduce((sum, entry) => sum + durationSeconds(entry), 0);
          return {
            date: date.toISOString().split('T')[0],
            dayOfWeek: dayName(date),
            totalSeconds,
          };
        });

        const totalSeconds = entries.reduce((sum, entry) => sum + durationSeconds(entry), 0);
        const todayProjects = state.projects
          .map((project) => ({
            projectId: project.id,
            projectName: project.name,
            projectColor: project.color,
            totalSeconds: todayEntries
              .filter((entry) => entry.projectId === project.id)
              .reduce((sum, entry) => sum + durationSeconds(entry), 0),
          }))
          .filter((project) => project.totalSeconds > 0);

        const clientBreakdown = state.clients.map((client) => ({
          clientId: client.id,
          clientName: client.name,
          totalSeconds: clientTotals.get(client.id) ?? 0,
          unbilledAmount: entries
            .filter((entry) => entry.clientId === client.id && entry.isBillable && !entry.isBilled)
            .reduce((sum, entry) => sum + (durationSeconds(entry) / 3600) * client.hourlyRate, 0),
          billedAmount: entries
            .filter((entry) => entry.clientId === client.id && entry.isBilled)
            .reduce((sum, entry) => sum + (durationSeconds(entry) / 3600) * client.hourlyRate, 0),
          downPaymentTotal: state.invoices
            .filter((invoice) => invoice.clientId === client.id)
            .reduce((sum, invoice) => sum + invoice.downPayment, 0),
          currency: client.currency,
        }));

        const amountBuckets = (field: 'unbilledAmount' | 'billedAmount') => {
          const buckets = new Map<string, number>();
          clientBreakdown.forEach((client) => {
            buckets.set(client.currency, (buckets.get(client.currency) ?? 0) + client[field]);
          });
          return Array.from(buckets, ([currency, amount]) => ({ currency, amount }));
        };

        const projectBreakdown = state.projects
          .map((project) => {
            const seconds = projectTotals.get(project.id) ?? 0;
            const stats = projectStats(project);
            return {
              projectId: project.id,
              projectName: project.name,
              projectColor: project.color,
              totalSeconds: seconds,
              percentOfTotal: totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0,
              budgetType: stats.budgetType,
              budgetStatus: stats.budgetStatus,
              budgetUsedPercent: stats.budgetUsedPercent,
              budgetRemainingHours: stats.budgetRemainingHours,
              budgetRemainingAmount: stats.budgetRemainingAmount,
            };
          })
          .filter((project) => project.totalSeconds > 0);

        return {
          today: {
            totalSeconds: todayProjects.reduce((sum, project) => sum + project.totalSeconds, 0),
            projects: todayProjects,
          },
          week: {
            totalSeconds: weekDays.reduce((sum, day) => sum + day.totalSeconds, 0),
            days: weekDays,
          },
          unbilled: {
            amountsByCurrency: amountBuckets('unbilledAmount'),
            hoursCount:
              entries
                .filter((entry) => entry.isBillable && !entry.isBilled)
                .reduce((sum, entry) => sum + durationSeconds(entry), 0) / 3600,
          },
          billed: {
            amountsByCurrency: amountBuckets('billedAmount'),
          },
          total: { totalSeconds },
          clientBreakdown,
          monthSummary: {
            year: todayDate.getFullYear(),
            month: todayDate.getMonth(),
            totalSeconds,
            daysWorked: weekDays.filter((day) => day.totalSeconds > 0).length,
            avgSecondsPerDay:
              totalSeconds / Math.max(1, weekDays.filter((day) => day.totalSeconds > 0).length),
            previousMonthSeconds: 0,
            perDay: weekDays,
          },
          projectBreakdown,
        };
      },
    },
  };

  return repository;
}

export type DemoRepository = ReturnType<typeof createDemoRepository>;

export const demoRepository = createDemoRepository();

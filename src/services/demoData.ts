import { DEFAULT_SETTINGS, type AppSettings } from '../types/settings';
import type { Client } from '../types/client';
import type { DownPayment } from '../types/downPayment';
import type { Invoice, InvoiceLineItem } from '../types/invoice';
import type { Product } from '../types/product';
import type { Project } from '../types/project';
import type { TimeEntry } from '../types/timeEntry';

function isoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function atTime(base: Date, hours: number, minutes: number): string {
  const date = new Date(base);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function addDays(base: Date, days: number): Date {
  const date = new Date(base);
  date.setDate(base.getDate() + days);
  return date;
}

export interface DemoSeedData {
  clients: Client[];
  projects: Project[];
  timeEntries: TimeEntry[];
  downPayments: DownPayment[];
  invoices: Invoice[];
  invoiceLineItems: InvoiceLineItem[];
  products: Product[];
  settings: AppSettings;
}

export function createDemoSeedData(now = new Date()): DemoSeedData {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = addDays(today, -1);
  const lastWeek = addDays(today, -6);
  const timestamp = atTime(today, 9, 0);

  const clients: Client[] = [
    {
      id: 'demo-client-acme',
      name: 'Acme Studio',
      email: 'hello@acme.example',
      address: '42 Maker Street, Dublin',
      phone: '+353 1 555 0100',
      vatNumber: 'IE1234567A',
      hourlyRate: 95,
      currency: 'EUR',
      notes: 'Retainer client with active design and build work.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'demo-client-nova',
      name: 'Nova Labs',
      email: 'ops@nova.example',
      address: '18 Research Lane, Cork',
      phone: '+353 21 555 0188',
      vatNumber: '',
      hourlyRate: 120,
      currency: 'EUR',
      notes: 'Product strategy and analytics support.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const projects: Project[] = [
    {
      id: 'demo-project-brand',
      clientId: 'demo-client-acme',
      name: 'Brand Refresh',
      description: 'New landing page, invoice templates, and launch visuals.',
      status: 'active',
      color: '#2563eb',
      budgetType: 'hourly',
      budgetHours: 5,
      budgetAmount: 0,
      budgetAlertThreshold: 0.8,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'demo-project-analytics',
      clientId: 'demo-client-nova',
      name: 'Analytics Sprint',
      description: 'Dashboard cleanup and reporting automation.',
      status: 'active',
      color: '#059669',
      budgetType: 'fixed',
      budgetHours: 0,
      budgetAmount: 500,
      budgetAlertThreshold: 0.75,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  const timeEntries: TimeEntry[] = [
    {
      id: 'demo-time-brand-today',
      projectId: 'demo-project-brand',
      startTime: atTime(today, 9, 30),
      endTime: atTime(today, 11, 45),
      pauseDuration: 0,
      notes: 'Homepage layout and accessibility pass.',
      isBillable: true,
      isBilled: false,
      createdAt: atTime(today, 11, 45),
    },
    {
      id: 'demo-time-brand-yesterday',
      projectId: 'demo-project-brand',
      startTime: atTime(yesterday, 13, 0),
      endTime: atTime(yesterday, 15, 30),
      pauseDuration: 600,
      notes: 'Invoice PDF polish.',
      isBillable: true,
      isBilled: true,
      createdAt: atTime(yesterday, 15, 30),
    },
    {
      id: 'demo-time-analytics-week',
      projectId: 'demo-project-analytics',
      startTime: atTime(lastWeek, 10, 0),
      endTime: atTime(lastWeek, 12, 0),
      pauseDuration: 0,
      notes: 'Dashboard metric review.',
      isBillable: true,
      isBilled: false,
      createdAt: atTime(lastWeek, 12, 0),
    },
  ];

  const invoices: Invoice[] = [
    {
      id: 'demo-invoice-1',
      clientId: 'demo-client-acme',
      invoiceNumber: 'INV-2026-0001',
      issueDate: isoDate(yesterday),
      dueDate: isoDate(addDays(yesterday, 30)),
      status: 'sent',
      notes: 'Thank you for the work this month.',
      taxRate: 0.23,
      downPayment: 250,
      createdAt: atTime(yesterday, 16, 0),
      updatedAt: atTime(yesterday, 16, 0),
    },
  ];

  const downPayments: DownPayment[] = [
    {
      id: 'demo-down-payment-1',
      clientId: 'demo-client-acme',
      projectId: 'demo-project-brand',
      amount: 250,
      paymentDate: isoDate(yesterday),
      notes: 'Deposit paid before brand refresh sprint.',
      createdAt: atTime(yesterday, 9, 15),
      updatedAt: atTime(yesterday, 9, 15),
    },
  ];

  const invoiceLineItems: InvoiceLineItem[] = [
    {
      id: 'demo-line-1',
      invoiceId: 'demo-invoice-1',
      description: 'Brand refresh sprint',
      quantity: 8,
      unitPrice: 95,
    },
    {
      id: 'demo-line-2',
      invoiceId: 'demo-invoice-1',
      description: 'Invoice PDF polish',
      quantity: 2,
      unitPrice: 95,
    },
  ];

  const products: Product[] = [
    {
      id: 'demo-product-audit',
      name: 'Technical Audit',
      description: 'Codebase review with written recommendations.',
      price: 1200,
      sku: 'AUDIT-TECH',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'demo-product-workshop',
      name: 'Design Systems Workshop',
      description: 'Half-day workshop for UI tokens and workflow setup.',
      price: 900,
      sku: 'WORKSHOP-DS',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  return {
    clients,
    projects,
    timeEntries,
    downPayments,
    invoices,
    invoiceLineItems,
    products,
    settings: {
      ...DEFAULT_SETTINGS,
      businessName: 'TimeSage Demo Studio',
      businessEmail: 'billing@timesage.example',
      businessAddress: '1 Local First Road, Dublin',
      businessPhone: '+353 1 555 0199',
      defaultTaxRate: 0.23,
      paymentTerms: 'Payment is due within 14 days.',
      seenChangelogVersion: '0.2.0',
    },
  };
}

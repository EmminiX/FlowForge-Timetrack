import { useState, useEffect, useMemo, useCallback } from 'react';
import { clientService, projectService, invoiceService } from '../services';
import type { Client, Project } from '../types';

export interface SearchResult {
  id: string;
  kind: 'search';
  type: 'client' | 'project' | 'invoice' | 'time-entry';
  title: string;
  subtitle?: string;
  route: string;
}

export type CommandAction =
  | 'start-timer'
  | 'create-invoice'
  | 'add-client'
  | 'mark-paid'
  | 'export-pdf'
  | 'quick-add-time';

export interface ActionResult {
  id: string;
  kind: 'action';
  action: CommandAction;
  title: string;
  subtitle?: string;
  route?: string;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  invoiceId?: string;
  invoiceNumber?: string;
}

export type CommandCenterItem = SearchResult | ActionResult;

interface CommandCenterInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  status: string;
}

interface BuildCommandCenterItemsInput {
  query: string;
  clients: Client[];
  projects: Project[];
  invoices: CommandCenterInvoice[];
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function includesQuery(value: string | undefined, query: string): boolean {
  return Boolean(value && normalize(value).includes(query));
}

function hasAnyToken(query: string, tokens: string[]): boolean {
  return tokens.some((token) => query.includes(token));
}

function addWorkflowActions(query: string): ActionResult[] {
  if (!query) return [];

  const actionIntent = hasAnyToken(query, [
    'add',
    'create',
    'new',
    'quick',
    'time',
    'invoice',
    'client',
  ]);
  if (!actionIntent) return [];

  return [
    {
      id: 'action-add-client',
      kind: 'action',
      action: 'add-client',
      title: 'Add Client',
      subtitle: 'Open the client form',
      route: '/clients?new=1',
    },
    {
      id: 'action-create-invoice',
      kind: 'action',
      action: 'create-invoice',
      title: 'Create Invoice',
      subtitle: 'Open the invoice builder',
      route: '/invoices?new=1',
    },
    {
      id: 'action-quick-add-time',
      kind: 'action',
      action: 'quick-add-time',
      title: 'Quick-Add Time',
      subtitle: 'Open time entries for a fast manual entry',
      route: '/time-entries?quick-add=1',
    },
  ];
}

export function buildCommandCenterItems({
  query,
  clients,
  projects,
  invoices,
}: BuildCommandCenterItemsInput): CommandCenterItem[] {
  const q = normalize(query);
  if (!q) return [];

  const matches: CommandCenterItem[] = [];

  matches.push(...addWorkflowActions(q));

  projects.forEach((project) => {
    if (
      project.status === 'active' &&
      hasAnyToken(q, ['start', 'timer', 'track']) &&
      includesQuery(project.name, q.replace(/\b(start|timer|track|for)\b/g, '').trim())
    ) {
      matches.push({
        id: `action-start-timer-${project.id}`,
        kind: 'action',
        action: 'start-timer',
        title: `Start Timer: ${project.name}`,
        subtitle: project.description || 'Start tracking this project',
        route: '/',
        projectId: project.id,
        projectName: project.name,
        projectColor: project.color,
      });
    }
  });

  invoices.forEach((invoice) => {
    const invoiceMatches =
      includesQuery(invoice.invoiceNumber, q) ||
      includesQuery(invoice.clientName, q) ||
      q.includes(normalize(invoice.invoiceNumber));

    if (!invoiceMatches && !includesQuery(`${invoice.invoiceNumber} ${invoice.clientName}`, q)) {
      return;
    }

    if (hasAnyToken(q, ['paid', 'mark'])) {
      matches.push({
        id: `action-mark-paid-${invoice.id}`,
        kind: 'action',
        action: 'mark-paid',
        title: `Mark Paid: ${invoice.invoiceNumber}`,
        subtitle: invoice.clientName,
        route: '/invoices',
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      });
    }

    if (hasAnyToken(q, ['pdf', 'export', 'download'])) {
      matches.push({
        id: `action-export-pdf-${invoice.id}`,
        kind: 'action',
        action: 'export-pdf',
        title: `Export PDF: ${invoice.invoiceNumber}`,
        subtitle: invoice.clientName,
        route: '/invoices',
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      });
    }
  });

  clients.forEach((client) => {
    if (includesQuery(client.name, q) || includesQuery(client.email, q)) {
      matches.push({
        id: `search-client-${client.id}`,
        kind: 'search',
        type: 'client',
        title: client.name,
        subtitle: client.email || undefined,
        route: '/clients',
      });
    }
  });

  projects.forEach((project) => {
    if (includesQuery(project.name, q)) {
      matches.push({
        id: `search-project-${project.id}`,
        kind: 'search',
        type: 'project',
        title: project.name,
        subtitle: project.description || undefined,
        route: '/projects',
      });
    }
  });

  invoices.forEach((invoice) => {
    if (includesQuery(invoice.invoiceNumber, q) || includesQuery(invoice.clientName, q)) {
      matches.push({
        id: `search-invoice-${invoice.id}`,
        kind: 'search',
        type: 'invoice',
        title: invoice.invoiceNumber,
        subtitle: `${invoice.clientName} — ${invoice.status}`,
        route: '/invoices',
      });
    }
  });

  return matches.slice(0, 20);
}

export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<
    { id: string; invoiceNumber: string; clientName: string; status: string }[]
  >([]);

  useEffect(() => {
    if (!isOpen) return;

    Promise.all([clientService.getAll(), projectService.getAll(), invoiceService.getAll()]).then(
      ([c, p, i]) => {
        setClients(c);
        setProjects(p);
        setInvoices(
          i.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            clientName: inv.clientName,
            status: inv.status,
          })),
        );
      },
    );
  }, [isOpen]);

  const results = useMemo((): CommandCenterItem[] => {
    return buildCommandCenterItems({ query, clients, projects, invoices });
  }, [query, clients, projects, invoices]);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  return { query, setQuery, isOpen, open, close, results };
}

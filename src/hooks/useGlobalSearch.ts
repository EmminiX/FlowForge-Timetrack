import { useState, useEffect, useMemo, useCallback } from 'react';
import { clientService, projectService, invoiceService } from '../services';
import type { Client, Project } from '../types';

export interface SearchResult {
  id: string;
  type: 'client' | 'project' | 'invoice' | 'time-entry';
  title: string;
  subtitle?: string;
  route: string;
}

export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<{ id: string; invoiceNumber: string; clientName: string; status: string }[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    Promise.all([
      clientService.getAll(),
      projectService.getAll(),
      invoiceService.getAll(),
    ]).then(([c, p, i]) => {
      setClients(c);
      setProjects(p);
      setInvoices(i.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        status: inv.status,
      })));
    });
  }, [isOpen]);

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const matches: SearchResult[] = [];

    clients.forEach((c) => {
      if (c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)) {
        matches.push({
          id: c.id,
          type: 'client',
          title: c.name,
          subtitle: c.email || undefined,
          route: '/clients',
        });
      }
    });

    projects.forEach((p) => {
      if (p.name.toLowerCase().includes(q)) {
        matches.push({
          id: p.id,
          type: 'project',
          title: p.name,
          subtitle: p.description || undefined,
          route: '/projects',
        });
      }
    });

    invoices.forEach((i) => {
      if (i.invoiceNumber.toLowerCase().includes(q) || i.clientName.toLowerCase().includes(q)) {
        matches.push({
          id: i.id,
          type: 'invoice',
          title: i.invoiceNumber,
          subtitle: `${i.clientName} — ${i.status}`,
          route: '/invoices',
        });
      }
    });

    return matches.slice(0, 20);
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

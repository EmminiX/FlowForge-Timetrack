import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectWithStats } from '../../types';
import { ClientGroup } from './ClientGroup';

function project(overrides: Partial<ProjectWithStats>): ProjectWithStats {
  return {
    id: 'project-1',
    clientId: 'client-1',
    clientName: 'Acme Studio',
    name: 'Brand Refresh',
    description: '',
    status: 'active',
    color: '#007AFF',
    budgetType: 'hourly',
    budgetHours: 10,
    budgetAmount: 0,
    budgetAlertThreshold: 0.8,
    budgetStatus: 'near',
    budgetUsedPercent: 85,
    budgetRemainingHours: 1.5,
    budgetRemainingAmount: null,
    totalHours: 8.5,
    totalBillable: 850,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ClientGroup budget alerts', () => {
  it('shows near-limit and over-budget scope alerts on project cards', () => {
    render(
      <ClientGroup
        clientName='Acme Studio'
        projects={[
          project({ id: 'project-near', name: 'Brand Refresh' }),
          project({
            id: 'project-over',
            name: 'Launch Sprint',
            budgetStatus: 'over',
            budgetType: 'fixed',
            budgetHours: 0,
            budgetAmount: 1000,
            budgetUsedPercent: 120,
            budgetRemainingHours: null,
            budgetRemainingAmount: -200,
          }),
        ]}
        onStatusChange={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /acme studio/i }));

    expect(screen.getByText('Near limit')).toBeInTheDocument();
    expect(screen.getByText('85% used')).toBeInTheDocument();
    expect(screen.getByText('1.5h left')).toBeInTheDocument();
    expect(screen.getByText('Over budget')).toBeInTheDocument();
    expect(screen.getByText('120% used')).toBeInTheDocument();
    expect(screen.getByText('€200 over')).toBeInTheDocument();
  });
});

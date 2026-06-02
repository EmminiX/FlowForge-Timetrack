import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarTimeView } from './CalendarTimeView';

const serviceMocks = vi.hoisted(() => ({
  getByDateRange: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  projectGetAll: vi.fn(),
}));

vi.mock('../../services', () => ({
  timeEntryService: {
    getByDateRange: serviceMocks.getByDateRange,
    update: serviceMocks.update,
    create: serviceMocks.create,
  },
  projectService: {
    getAll: serviceMocks.projectGetAll,
  },
}));

const project = {
  id: 'project-1',
  clientId: 'client-1',
  name: 'Brand Refresh',
  description: '',
  color: '#14b8a6',
  status: 'active',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const timeEntry = {
  id: 'entry-1',
  projectId: 'project-1',
  projectName: 'Brand Refresh',
  projectColor: '#14b8a6',
  clientId: 'client-1',
  clientName: 'Acme Studio',
  startTime: '2026-06-02T09:00:00.000Z',
  endTime: '2026-06-02T10:00:00.000Z',
  pauseDuration: 0,
  notes: 'Design review',
  isBillable: true,
  isBilled: false,
  createdAt: '2026-06-02T09:00:00.000Z',
};

describe('CalendarTimeView', () => {
  beforeEach(() => {
    serviceMocks.getByDateRange.mockResolvedValue([timeEntry]);
    serviceMocks.update.mockResolvedValue(null);
    serviceMocks.create.mockResolvedValue(null);
    serviceMocks.projectGetAll.mockResolvedValue([project]);
  });

  it('renders day and week calendar views with entries and missed-work gaps', async () => {
    render(<CalendarTimeView initialDate={new Date('2026-06-02T12:00:00.000Z')} />);

    expect(await screen.findByText('Brand Refresh')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /add missed work 10:00 to 18:00/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Week' }));

    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Mon 1')).toBeInTheDocument();
    expect(screen.getByText('Sun 7')).toBeInTheDocument();
  });

  it('resizes an entry with keyboard-accessible controls', async () => {
    render(<CalendarTimeView initialDate={new Date('2026-06-02T12:00:00.000Z')} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Extend Brand Refresh by 15 minutes' }));

    await waitFor(() => {
      expect(serviceMocks.update).toHaveBeenCalledWith('entry-1', {
        endTime: '2026-06-02T10:15:00.000Z',
      });
    });
  });
});

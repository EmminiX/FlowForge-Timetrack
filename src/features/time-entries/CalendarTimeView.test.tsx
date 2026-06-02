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
    vi.clearAllMocks();
    serviceMocks.getByDateRange.mockResolvedValue([timeEntry]);
    serviceMocks.update.mockResolvedValue(null);
    serviceMocks.create.mockResolvedValue(null);
    serviceMocks.projectGetAll.mockResolvedValue([project]);
  });

  it('renders day and week calendar views with entries and missed-work gaps', async () => {
    render(<CalendarTimeView initialDate={new Date('2026-06-02T12:00:00.000Z')} />);

    expect(await screen.findByText('Brand Refresh')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('button', { name: /add missed work 10:00 to 18:00/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Week' }));

    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Mon 1')).toBeInTheDocument();
    expect(screen.getByText('Sun 7')).toBeInTheDocument();
  });

  it('resizes an entry with keyboard-accessible controls', async () => {
    render(<CalendarTimeView initialDate={new Date('2026-06-02T12:00:00.000Z')} />);

    const endHandle = await screen.findByRole('button', {
      name: /adjust end time for brand refresh/i,
    });

    expect(endHandle.className).toContain('min-h-11');

    fireEvent.keyDown(endHandle, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(serviceMocks.update).toHaveBeenCalledWith('entry-1', {
        endTime: '2026-06-02T10:15:00.000Z',
      });
    });
  });

  it('creates missed work with editable local datetime fields', async () => {
    render(<CalendarTimeView initialDate={new Date('2026-06-02T12:00:00.000Z')} />);

    fireEvent.click(await screen.findByRole('button', { name: /add missed work 10:00 to 18:00/i }));

    const startInput = screen.getByLabelText('Start') as HTMLInputElement;
    const endInput = screen.getByLabelText('End') as HTMLInputElement;

    expect(startInput).toHaveAttribute('type', 'datetime-local');
    expect(endInput).toHaveAttribute('type', 'datetime-local');
    expect(startInput).not.toBeDisabled();
    expect(endInput).not.toBeDisabled();
    expect(startInput.value).not.toContain('.000Z');

    fireEvent.change(startInput, { target: { value: '2026-06-02T10:15' } });
    fireEvent.change(endInput, { target: { value: '2026-06-02T11:45' } });
    fireEvent.click(screen.getByRole('button', { name: /save time/i }));

    await waitFor(() => {
      expect(serviceMocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          startTime: new Date('2026-06-02T10:15').toISOString(),
          endTime: new Date('2026-06-02T11:45').toISOString(),
        }),
      );
    });
  });

  it('shows inline validation for invalid missed-work times', async () => {
    render(<CalendarTimeView initialDate={new Date('2026-06-02T12:00:00.000Z')} />);

    fireEvent.click(await screen.findByRole('button', { name: /add missed work 10:00 to 18:00/i }));

    fireEvent.change(screen.getByLabelText('Start'), {
      target: { value: '2026-06-02T12:00' },
    });
    fireEvent.change(screen.getByLabelText('End'), {
      target: { value: '2026-06-02T11:30' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save time/i }));

    expect(await screen.findByText(/end must be after start/i)).toBeInTheDocument();
    expect(serviceMocks.create).not.toHaveBeenCalled();
  });

  it('opens a full edit modal from a calendar block', async () => {
    render(<CalendarTimeView initialDate={new Date('2026-06-02T12:00:00.000Z')} />);

    fireEvent.click(
      await screen.findByRole('button', { name: /move or edit brand refresh time entry/i }),
    );

    expect(screen.getByRole('dialog', { name: /edit time entry/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Notes'), {
      target: { value: 'Updated calendar notes' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(serviceMocks.update).toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({
          notes: 'Updated calendar notes',
        }),
      );
    });
  });

  it('moves a block by dragging its body in 15-minute snaps', async () => {
    render(<CalendarTimeView initialDate={new Date('2026-06-02T12:00:00.000Z')} />);

    const blockBody = await screen.findByRole('button', {
      name: /move or edit brand refresh time entry/i,
    });

    fireEvent.pointerDown(blockBody, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(window, { clientY: 128, pointerId: 1 });
    fireEvent.pointerUp(window, { clientY: 128, pointerId: 1 });

    await waitFor(() => {
      expect(serviceMocks.update).toHaveBeenCalledWith('entry-1', {
        startTime: '2026-06-02T09:30:00.000Z',
        endTime: '2026-06-02T10:30:00.000Z',
      });
    });
  });

  it('resizes the start edge with keyboard alternatives', async () => {
    render(<CalendarTimeView initialDate={new Date('2026-06-02T12:00:00.000Z')} />);

    const startHandle = await screen.findByRole('button', {
      name: /adjust start time for brand refresh/i,
    });

    expect(startHandle.className).toContain('min-h-11');

    fireEvent.keyDown(startHandle, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(serviceMocks.update).toHaveBeenCalledWith('entry-1', {
        startTime: '2026-06-02T09:15:00.000Z',
      });
    });
  });
});

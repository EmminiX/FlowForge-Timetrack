import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectForm } from './ProjectForm';

const serviceMocks = vi.hoisted(() => ({
  clientGetAll: vi.fn(),
}));

vi.mock('../../services', () => ({
  clientService: {
    getAll: serviceMocks.clientGetAll,
  },
}));

describe('ProjectForm budget fields', () => {
  beforeEach(() => {
    serviceMocks.clientGetAll.mockResolvedValue([]);
  });

  it('submits hourly budget and alert threshold values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<ProjectForm isOpen={true} onClose={vi.fn()} onSubmit={onSubmit} />);

    const budgetTypeSelect = await screen.findByLabelText('Budget type');
    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Budgeted Build' } });
    fireEvent.change(budgetTypeSelect, {
      target: { value: 'hourly' },
    });
    fireEvent.change(screen.getByLabelText('Hour budget'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Alert at'), { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: /create project/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Budgeted Build',
          budgetType: 'hourly',
          budgetHours: 12,
          budgetAmount: 0,
          budgetAlertThreshold: 0.75,
        }),
      );
    });
  });
});

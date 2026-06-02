import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrivateTimeline } from './PrivateTimeline';

const serviceMocks = vi.hoisted(() => ({
  updateSetting: vi.fn(),
  getRecent: vi.fn(),
  getSuggestions: vi.fn(),
  linkTimeEntry: vi.fn(),
  dismiss: vi.fn(),
  projectGetAll: vi.fn(),
  timeEntryCreate: vi.fn(),
}));

let timelineEnabled = true;

vi.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: {
      enablePrivateTimeline: timelineEnabled,
    },
    updateSetting: serviceMocks.updateSetting,
  }),
}));

vi.mock('../../services', () => ({
  activityTimelineService: {
    getRecent: serviceMocks.getRecent,
    getSuggestions: serviceMocks.getSuggestions,
    linkTimeEntry: serviceMocks.linkTimeEntry,
    dismiss: serviceMocks.dismiss,
  },
  projectService: {
    getAll: serviceMocks.projectGetAll,
  },
  timeEntryService: {
    create: serviceMocks.timeEntryCreate,
  },
}));

describe('PrivateTimeline', () => {
  beforeEach(() => {
    timelineEnabled = true;
    serviceMocks.updateSetting.mockReset();
    serviceMocks.getRecent.mockReset();
    serviceMocks.getSuggestions.mockReset();
    serviceMocks.linkTimeEntry.mockReset();
    serviceMocks.dismiss.mockReset();
    serviceMocks.projectGetAll.mockReset();
    serviceMocks.timeEntryCreate.mockReset();

    serviceMocks.getRecent.mockResolvedValue([
      {
        id: 'timeline-1',
        eventType: 'activity',
        appName: 'Figma',
        windowTitle: 'Design System Audit',
        startedAt: '2026-06-02T09:00:00.000Z',
        endedAt: '2026-06-02T09:40:00.000Z',
        durationSeconds: 2400,
        source: 'system',
        projectId: null,
        timeEntryId: null,
        notes: '',
        isDismissed: false,
        createdAt: '2026-06-02T09:40:00.000Z',
      },
      {
        id: 'timeline-2',
        eventType: 'idle',
        appName: 'Idle',
        windowTitle: null,
        startedAt: '2026-06-02T09:40:00.000Z',
        endedAt: '2026-06-02T09:55:00.000Z',
        durationSeconds: 900,
        source: 'system',
        projectId: null,
        timeEntryId: null,
        notes: '',
        isDismissed: false,
        createdAt: '2026-06-02T09:55:00.000Z',
      },
    ]);
    serviceMocks.getSuggestions.mockResolvedValue([
      {
        id: 'timeline-1',
        title: 'Figma - Design System Audit',
        startedAt: '2026-06-02T09:00:00.000Z',
        endedAt: '2026-06-02T09:40:00.000Z',
        durationSeconds: 2400,
        eventIds: ['timeline-1'],
        notes: 'Suggested from private timeline: Figma - Design System Audit',
      },
    ]);
    serviceMocks.projectGetAll.mockResolvedValue([
      {
        id: 'project-1',
        clientId: 'client-1',
        name: 'Brand Refresh',
        description: '',
        color: '#2563eb',
        status: 'active',
        budgetType: 'none',
        budgetHours: 0,
        budgetAmount: 0,
        budgetAlertThreshold: 0.8,
        createdAt: '2026-06-02T00:00:00.000Z',
        updatedAt: '2026-06-02T00:00:00.000Z',
      },
    ]);
    serviceMocks.timeEntryCreate.mockResolvedValue({ id: 'entry-1' });
  });

  it('shows a privacy-first disabled state until the user opts in', async () => {
    timelineEnabled = false;

    render(<PrivateTimeline />);

    expect(screen.getByText('Private Auto-Timeline')).toBeInTheDocument();
    expect(screen.getByText('Off until you enable it')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /enable private timeline/i }));

    await waitFor(() => {
      expect(serviceMocks.updateSetting).toHaveBeenCalledWith('enablePrivateTimeline', true);
    });
  });

  it('renders local activity, idle gaps, and converts a suggestion into a time entry', async () => {
    render(<PrivateTimeline />);

    expect(await screen.findByText('Figma')).toBeInTheDocument();
    expect(screen.getByText('Design System Audit')).toBeInTheDocument();
    expect(screen.getByText('Idle gap')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /create suggested entry/i }));

    await waitFor(() => {
      expect(serviceMocks.timeEntryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          startTime: '2026-06-02T09:00:00.000Z',
          endTime: '2026-06-02T09:40:00.000Z',
          notes: expect.stringContaining('Figma'),
        }),
      );
      expect(serviceMocks.linkTimeEntry).toHaveBeenCalledWith(['timeline-1'], 'entry-1');
    });
  });
});

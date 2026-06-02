import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TimeEntries } from './TimeEntries';

vi.mock('../features/time-entries', () => ({
  TimeEntriesList: () => <div>List View</div>,
  CalendarTimeView: () => <div>Calendar View</div>,
}));

describe('TimeEntries page', () => {
  it('shows the list view by default', () => {
    render(
      <MemoryRouter initialEntries={['/time-entries']}>
        <TimeEntries />
      </MemoryRouter>,
    );

    expect(screen.getByText('List View')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /calendar/i })).toHaveAttribute(
      'href',
      '/time-entries/calendar',
    );
  });

  it('shows the calendar view on the calendar route', () => {
    render(
      <MemoryRouter initialEntries={['/time-entries/calendar']}>
        <TimeEntries />
      </MemoryRouter>,
    );

    expect(screen.getByText('Calendar View')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /list/i })).toHaveAttribute('href', '/time-entries');
  });
});

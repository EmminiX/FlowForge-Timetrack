import { afterEach, describe, expect, it, vi } from 'vitest';
import { timeEntryService } from './timeEntryService';

describe('timeEntryService.getByDateRange', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads time entries with start and end date filters', async () => {
    const getAll = vi.spyOn(timeEntryService, 'getAll').mockResolvedValue([]);

    await timeEntryService.getByDateRange(
      '2026-06-01T00:00:00.000Z',
      '2026-06-08T00:00:00.000Z',
    );

    expect(getAll).toHaveBeenCalledWith({
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-06-08T00:00:00.000Z',
    });
  });
});

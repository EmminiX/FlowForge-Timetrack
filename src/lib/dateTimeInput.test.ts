import { describe, expect, it } from 'vitest';
import {
  datetimeInputValueToIso,
  getDurationSecondsFromLocalInputs,
  toLocalDatetimeInputValue,
} from './dateTimeInput';

describe('dateTimeInput', () => {
  it('round-trips ISO values through datetime-local values', () => {
    const iso = '2026-06-02T10:15:00.000Z';
    const localValue = toLocalDatetimeInputValue(iso);

    expect(localValue).toMatch(/^2026-06-02T\d{2}:15$/);
    expect(datetimeInputValueToIso(localValue)).toBe(iso);
  });

  it('calculates duration from local datetime input values', () => {
    expect(getDurationSecondsFromLocalInputs('2026-06-02T10:15', '2026-06-02T11:45')).toBe(90 * 60);
  });
});

export function toLocalDatetimeInputValue(iso: string | null | undefined): string {
  if (!iso) return '';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

export function datetimeInputValueToIso(value: string): string {
  return new Date(value).toISOString();
}

export function getDurationSecondsFromLocalInputs(
  startTime: string,
  endTime: string,
  pauseDuration = 0,
): number {
  if (!startTime || !endTime) return 0;

  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) return 0;

  return Math.max(0, (end - start) / 1000 - pauseDuration);
}

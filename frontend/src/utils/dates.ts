// The API sends ISO-8601 instants ("2026-04-14T09:30:00Z") for timestamps and plain
// dates ("2026-04-14") for calendar dates. The screens show display strings such as
// "14 Apr 2026". These helpers convert between the two.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses an API date or instant. Plain dates are read as local dates, not UTC midnight. */
export function parseApiDate(value: string): Date | null {
  const match = DATE_ONLY.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms);
}

/** "14 Apr 2026". Empty input gives an empty string. */
export function formatDisplayDate(value?: string | null): string {
  if (!value) return '';
  const d = parseApiDate(value);
  if (!d) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "14 Apr 2026, 09:30". Empty input gives an empty string. */
export function formatDisplayDateTime(value?: string | null): string {
  if (!value) return '';
  const d = parseApiDate(value);
  if (!d) return value;
  return `${formatDisplayDate(value)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

/** "09:30" for an instant, or the time-of-day for a chat bubble. */
export function formatTime(value?: string | null): string {
  if (!value) return '';
  const d = parseApiDate(value);
  return d ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : value;
}

/** yyyy-MM-dd in local time, the format the API expects for calendar dates. */
export function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The calendar date a number of days from today, in API format. */
export function isoDaysFromToday(days: number): string {
  return toIsoDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

/**
 * Turns text typed by a person ("14 Apr 2026" or "2026-04-14") into the API date format.
 * Returns undefined when the text is not a date.
 */
export function apiDateFromText(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const d = parseApiDate(trimmed) ?? new Date(trimmed);
  return Number.isNaN(d.getTime()) ? undefined : toIsoDate(d);
}

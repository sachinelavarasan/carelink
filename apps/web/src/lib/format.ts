const dateTime = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });
const dayHeading = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const dateOnly = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export const fmtDateTime = (iso: string) => dateTime.format(new Date(iso));
export const fmtTime = (iso: string) => time.format(new Date(iso));
export const fmtDayHeading = (iso: string) => dayHeading.format(new Date(iso));
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Formats a plain `YYYY-MM-DD` (or ISO) date — tz-safe for date-only strings. */
export const fmtDate = (value: string) => {
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const d = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    : new Date(value);
  return Number.isNaN(d.getTime()) ? value : dateOnly.format(d);
};

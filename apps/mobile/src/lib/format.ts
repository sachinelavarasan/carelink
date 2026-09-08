const dateTime = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});
const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });
const dayHeading = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

const dateOnly = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const weekday = new Intl.DateTimeFormat('en-IN', { weekday: 'long' });
const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

export const fmtDateTime = (iso: string) => dateTime.format(new Date(iso));
export const fmtTime = (iso: string) => time.format(new Date(iso));
export const fmtDayHeading = (iso: string) => dayHeading.format(new Date(iso));
export const fmtDate = (iso: string) => dateOnly.format(new Date(iso));
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export const isToday = (iso: string) => startOfDay(new Date(iso)) === startOfDay(new Date());

/** "Today" / "Tomorrow" / weekday within a week / short date beyond that. */
export const relativeDay = (iso: string): string => {
  const d = new Date(iso);
  const days = Math.round((startOfDay(d) - startOfDay(new Date())) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days < 7) return weekday.format(d);
  return shortDate.format(d);
};

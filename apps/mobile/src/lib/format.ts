const dateTime = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});
const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });
const dayHeading = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

export const fmtDateTime = (iso: string) => dateTime.format(new Date(iso));
export const fmtTime = (iso: string) => time.format(new Date(iso));
export const fmtDayHeading = (iso: string) => dayHeading.format(new Date(iso));
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

import type { AppointmentStatus, DrugCategoryFlag } from '@carelink/shared';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral';

export type BadgeIcon =
  | 'clock'
  | 'check-circle'
  | 'x-circle'
  | 'check-check'
  | 'triangle-alert'
  | 'user-x'
  | 'pill'
  | 'file-text'
  | 'lock';

export interface BadgeMeta {
  label: string;
  variant: BadgeVariant;
  icon: BadgeIcon;
}

/**
 * Appointment lifecycle → badge. Colour is never the only signal: every badge
 * also carries a distinct icon and text label (NO_SHOW vs CANCELLED, and the
 * escalating drug schedules, are told apart by icon + label, not hue).
 */
export const appointmentStatusMeta: Record<AppointmentStatus, BadgeMeta> = {
  REQUESTED: { label: 'Requested', variant: 'warning', icon: 'clock' },
  CONFIRMED: { label: 'Confirmed', variant: 'success', icon: 'check-circle' },
  CANCELLED: { label: 'Cancelled', variant: 'danger', icon: 'x-circle' },
  COMPLETED: { label: 'Completed', variant: 'neutral', icon: 'check-check' },
  NO_SHOW: { label: 'No-show', variant: 'danger', icon: 'user-x' },
};

/** Drug schedule flag → badge, emphasis escalating OTC → Schedule X. */
export const drugCategoryFlagMeta: Record<DrugCategoryFlag, BadgeMeta> = {
  OTC: { label: 'OTC', variant: 'success', icon: 'pill' },
  SCHEDULE_H: { label: 'Schedule H', variant: 'warning', icon: 'file-text' },
  SCHEDULE_H1: { label: 'Schedule H1', variant: 'danger', icon: 'triangle-alert' },
  SCHEDULE_X: { label: 'Schedule X', variant: 'danger', icon: 'lock' },
};

/** Tailwind classes per variant — the same class strings work in web and NativeWind. */
export const badgeVariantClass: Record<BadgeVariant, string> = {
  success: 'bg-success-bg text-success-fg border-success-border',
  warning: 'bg-warning-bg text-warning-fg border-warning-border',
  danger: 'bg-danger-bg text-danger-fg border-danger-border',
  neutral: 'bg-muted text-muted-foreground border-border',
};

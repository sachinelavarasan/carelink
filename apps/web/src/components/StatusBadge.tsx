import type { AppointmentStatus, DrugCategoryFlag } from '@carelink/shared';
import {
  type BadgeIcon,
  appointmentStatusMeta,
  badgeVariantClass,
  drugCategoryFlagMeta,
} from '@carelink/theme';
import {
  CheckCheckIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  FileTextIcon,
  LockIcon,
  type LucideIcon,
  PillIcon,
  TriangleAlertIcon,
  UserXIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ICONS: Record<BadgeIcon, LucideIcon> = {
  'clock': ClockIcon,
  'check-circle': CircleCheckIcon,
  'x-circle': CircleXIcon,
  'check-check': CheckCheckIcon,
  'triangle-alert': TriangleAlertIcon,
  'user-x': UserXIcon,
  'pill': PillIcon,
  'file-text': FileTextIcon,
  'lock': LockIcon,
};

type Props =
  | { kind: 'appointment'; status: AppointmentStatus; className?: string }
  | { kind: 'drug'; flag: DrugCategoryFlag; className?: string };

/** Colour + icon + label — never colour alone (colourblind-safe). */
export function StatusBadge(props: Props) {
  const meta =
    props.kind === 'appointment'
      ? appointmentStatusMeta[props.status]
      : drugCategoryFlagMeta[props.flag];
  const Icon = ICONS[meta.icon];
  return (
    <Badge variant="outline" className={cn('border', badgeVariantClass[meta.variant], props.className)}>
      <Icon aria-hidden />
      {meta.label}
    </Badge>
  );
}

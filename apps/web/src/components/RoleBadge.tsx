import type { UserRole } from '@carelink/shared';
import { ShieldCheckIcon, StethoscopeIcon, UserRoundIcon } from 'lucide-react';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

const meta: Record<string, { label: string; Icon: typeof UserRoundIcon; cls: string }> = {
  DOCTOR: {
    label: 'Doctor',
    Icon: StethoscopeIcon,
    cls: 'border-primary/30 bg-primary/10 text-primary',
  },
  PATIENT: {
    label: 'Patient',
    Icon: UserRoundIcon,
    cls: 'border-border bg-muted text-muted-foreground',
  },
  ADMIN: { label: 'Admin', Icon: ShieldCheckIcon, cls: 'border-border bg-muted text-foreground' },
};

/** A labelled, icon-led pill that says whether an account is a doctor or a
 *  patient — used in the navbar and on the profile screen. */
export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  const m = meta[role] ?? meta.PATIENT!;
  const { label, Icon } = m;
  return (
    <Badge variant="outline" className={cn('border gap-1', m.cls, className)}>
      <Icon aria-hidden />
      {label}
    </Badge>
  );
}

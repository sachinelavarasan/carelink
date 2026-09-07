import type { ReactNode } from 'react';
import { CircleAlertIcon, CircleCheckIcon, TriangleAlertIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type Kind = 'error' | 'success' | 'warning';

const look: Record<Kind, { cls: string; Icon: typeof CircleAlertIcon }> = {
  error: { cls: 'border-danger-border bg-danger-bg text-danger-fg', Icon: CircleAlertIcon },
  success: { cls: 'border-success-border bg-success-bg text-success-fg', Icon: CircleCheckIcon },
  warning: { cls: 'border-warning-border bg-warning-bg text-warning-fg', Icon: TriangleAlertIcon },
};

/** App-level 3-state notice built on the shadcn <Alert> shell. */
export function Notice({ kind, children }: { kind: Kind; children: ReactNode }) {
  const { cls, Icon } = look[kind];
  return (
    <Alert className={cn('mb-4', cls)}>
      <Icon />
      <AlertDescription className="text-current">{children}</AlertDescription>
    </Alert>
  );
}

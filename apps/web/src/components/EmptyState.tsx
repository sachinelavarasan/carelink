import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Centred placeholder for a list/grid that has loaded but has nothing to show.
 *  Give it a reason and, where useful, a way forward (`action`). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center">
      {Icon && <Icon aria-hidden className="size-8 text-muted-foreground/60" />}
      <p className="font-medium">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

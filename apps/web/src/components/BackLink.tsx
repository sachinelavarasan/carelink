import type { ReactNode } from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/** A consistent "back" affordance placed at the start of a screen's header,
 *  above the title. Pair with ScrollToTop so a back navigation lands here. */
export function BackLink({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
    >
      <ArrowLeftIcon className="size-4" />
      {children}
    </Link>
  );
}

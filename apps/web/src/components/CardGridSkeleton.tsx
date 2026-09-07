import { Card, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';

/** The shared responsive card grid: 1 → 2 (sm) → 3 (lg) → 4 (xl). */
export const cardGridClass = 'grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

/** One placeholder card — a title line, a status pill, two meta lines, an action. */
export function CardSkeleton() {
  return (
    <Card>
      <CardContent className="grid gap-2">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="mt-1 h-7 w-32 rounded-md" />
      </CardContent>
    </Card>
  );
}

/** A full grid of placeholder cards, matching `cardGridClass`. */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={cardGridClass} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

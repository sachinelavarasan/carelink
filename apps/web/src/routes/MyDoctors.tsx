import type { VisitedDoctor } from '@carelink/shared';
import { useQuery } from '@tanstack/react-query';
import { UsersRoundIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { CardGridSkeleton, cardGridClass } from '../components/CardGridSkeleton';
import { EmptyState } from '../components/EmptyState';
import { Notice } from '../components/Notice';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { apiGet } from '../lib/api';
import { fmtDateTime } from '../lib/format';

/** Patient's list of doctors they've consulted. Each card opens the full
 *  consultation history with that doctor. */
export default function MyDoctors() {
  const visitedQ = useQuery({
    queryKey: ['my-doctors'],
    queryFn: () => apiGet<VisitedDoctor[]>('/me/doctors'),
  });
  const doctors = visitedQ.data ?? [];

  return (
    <AppShell>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">My doctors</h1>
        <Link className="text-sm text-primary underline underline-offset-4" to="/history">
          All history →
        </Link>
      </div>

      {visitedQ.isLoading && <CardGridSkeleton count={4} />}
      {visitedQ.isError && <Notice kind="error">Could not load your doctors.</Notice>}
      {visitedQ.data && doctors.length === 0 && (
        <EmptyState
          icon={UsersRoundIcon}
          title="No doctors yet"
          description="Doctors you consult will be listed here for quick access to their history."
          action={
            <Link className="text-sm text-primary underline underline-offset-4" to="/doctors">
              Find a doctor
            </Link>
          }
        />
      )}

      <div className={cardGridClass}>
        {doctors.map((d) => (
          <Card key={d.id}>
            <CardContent className="grid gap-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="font-medium">{d.fullName}</strong>
                <Badge variant="secondary">
                  {d.visitCount} visit{d.visitCount === 1 ? '' : 's'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {d.specializations.join(', ') || d.qualifications}
              </p>
              <p className="text-sm text-muted-foreground">
                Last visit {fmtDateTime(d.lastVisitedAt)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                <Link
                  className="text-primary underline underline-offset-4"
                  to={`/my-doctors/${d.id}`}
                >
                  View history
                </Link>
                <Link
                  className="text-primary underline underline-offset-4"
                  to={`/book?doctorId=${d.id}`}
                >
                  Book again
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

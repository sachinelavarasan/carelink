import type { VisitedPatient } from '@carelink/shared';
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

function ageFrom(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

/** Doctor's list of patients they've consulted. Each card opens that patient's
 *  full history (limited to this doctor's own appointments). */
export default function Patients() {
  const patientsQ = useQuery({
    queryKey: ['my-patients'],
    queryFn: () => apiGet<VisitedPatient[]>('/me/patients'),
  });
  const patients = patientsQ.data ?? [];

  return (
    <AppShell>
      <h1 className="mb-3 text-xl font-semibold">Patients</h1>

      {patientsQ.isLoading && <CardGridSkeleton count={4} />}
      {patientsQ.isError && <Notice kind="error">Could not load patients.</Notice>}
      {patientsQ.data && patients.length === 0 && (
        <EmptyState
          icon={UsersRoundIcon}
          title="No patients yet"
          description="Patients you consult will appear here with a link to their history."
        />
      )}

      <div className={cardGridClass}>
        {patients.map((p) => {
          const age = ageFrom(p.dob);
          const meta = [p.gender, age != null ? `${age} yrs` : null].filter(Boolean).join(' · ');
          return (
            <Card key={p.id}>
              <CardContent className="grid gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="font-medium">{p.fullName}</strong>
                  <Badge variant="secondary">
                    {p.visitCount} visit{p.visitCount === 1 ? '' : 's'}
                  </Badge>
                </div>
                {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
                <p className="text-sm text-muted-foreground">
                  Last seen {fmtDateTime(p.lastVisitedAt)}
                </p>
                <Link
                  className="mt-1 w-fit text-sm text-primary underline underline-offset-4"
                  to={`/patients/${p.id}/history`}
                >
                  View history →
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}

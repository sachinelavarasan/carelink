import type { DoctorPublic, DoctorSort, VisitedDoctor } from '@carelink/shared';
import { useQuery } from '@tanstack/react-query';
import { SearchXIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { CardGridSkeleton, cardGridClass } from '../components/CardGridSkeleton';
import { EmptyState } from '../components/EmptyState';
import { Notice } from '../components/Notice';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { apiGet } from '../lib/api';
import { fmtDateTime } from '../lib/format';

const SORTS: { value: DoctorSort; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'fee', label: 'Lowest fee' },
  { value: 'experience', label: 'Most experienced' },
];

export default function Doctors() {
  const [q, setQ] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [sort, setSort] = useState<DoctorSort>('name');

  const specsQ = useQuery({
    queryKey: ['specializations'],
    queryFn: () => apiGet<string[]>('/doctors/specializations'),
  });
  const visitedQ = useQuery({
    queryKey: ['my-doctors'],
    queryFn: () => apiGet<VisitedDoctor[]>('/me/doctors'),
  });
  const doctorsQ = useQuery({
    queryKey: ['doctors', q, specialization, sort],
    queryFn: () =>
      apiGet<DoctorPublic[]>('/doctors', {
        ...(q ? { q } : {}),
        ...(specialization ? { specialization } : {}),
        sort,
      }),
  });

  const visited = visitedQ.data ?? [];

  return (
    <AppShell>
      <h1 className="text-xl font-semibold">Find a doctor</h1>

      {visited.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-medium">Doctors you&apos;ve seen</h2>
          <div className="mt-2 grid gap-2">
            {visited.map((d) => (
              <Card key={d.id}>
                <CardContent className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{d.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {d.specializations.join(', ')} · last visit {fmtDateTime(d.lastVisitedAt)}
                    </p>
                  </div>
                  <Link
                    className="text-sm text-primary underline underline-offset-4"
                    to={`/book?doctorId=${d.id}`}
                  >
                    Book again
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            className="min-w-48 flex-1"
            placeholder="Search by name, specialization, or keyword"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select
            value={specialization || 'all'}
            onValueChange={(v) => setSpecialization(v && v !== 'all' ? String(v) : '')}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Any specialization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any specialization</SelectItem>
              {(specsQ.data ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as DoctorSort)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {doctorsQ.isLoading && (
          <div className="mt-4">
            <CardGridSkeleton count={6} />
          </div>
        )}
        {doctorsQ.isError && (
          <div className="mt-4">
            <Notice kind="error">Could not load doctors.</Notice>
          </div>
        )}
        {doctorsQ.data && doctorsQ.data.length === 0 && (
          <div className="mt-4">
            <EmptyState
              icon={SearchXIcon}
              title="No doctors match that search"
              description="Try a different name, specialization, or clear the filters."
            />
          </div>
        )}

        <div className={`mt-4 ${cardGridClass}`}>
          {doctorsQ.data?.map((d) => (
            <Card key={d.id}>
              <CardContent className="grid gap-1">
                <div className="flex items-center justify-between gap-4">
                  <Link
                    to={`/doctors/${d.id}`}
                    className="font-medium text-primary underline underline-offset-4"
                  >
                    {d.fullName}
                  </Link>
                  <span className="text-sm text-muted-foreground">₹{d.consultationFeeInr}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {d.specializations.join(', ')} · {d.qualifications} · {d.yearsExperience} yrs
                </p>
                {d.bio && <p className="line-clamp-2 text-sm">{d.bio}</p>}
                <Link
                  className="mt-1 w-fit text-sm text-primary underline underline-offset-4"
                  to={`/book?doctorId=${d.id}`}
                >
                  Book a consultation →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

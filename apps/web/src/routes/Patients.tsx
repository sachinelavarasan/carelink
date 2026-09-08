import type { VisitedPatient } from '@carelink/shared';
import { useQuery } from '@tanstack/react-query';
import { SearchIcon, UsersRoundIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { Notice } from '../components/Notice';
import { NoMatches, TablePanel, TableSkeleton, useClientPaging } from '../components/TablePanel';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
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

type Sort = 'recent' | 'name' | 'visits';

/** Doctor's list of patients they've consulted. Each row opens that patient's
 *  full history (limited to this doctor's own appointments). */
export default function Patients() {
  const patientsQ = useQuery({
    queryKey: ['my-patients'],
    queryFn: () => apiGet<VisitedPatient[]>('/me/patients'),
  });
  const all = patientsQ.data ?? [];

  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('recent');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? all.filter((p) => p.fullName.toLowerCase().includes(needle))
      : all.slice();
    filtered.sort((a, b) => {
      if (sort === 'name') return a.fullName.localeCompare(b.fullName);
      if (sort === 'visits') return b.visitCount - a.visitCount;
      return b.lastVisitedAt.localeCompare(a.lastVisitedAt);
    });
    return filtered;
  }, [all, q, sort]);

  const { page, setPage, pageCount, pageItems, pageSize, total } = useClientPaging(rows, {
    resetKey: `${q}|${sort}`,
  });

  return (
    <AppShell>
      <h1 className="mb-3 text-xl font-semibold">Patients</h1>

      {patientsQ.isLoading && <TableSkeleton cols={5} />}
      {patientsQ.isError && <Notice kind="error">Could not load patients.</Notice>}
      {patientsQ.data && all.length === 0 && (
        <EmptyState
          icon={UsersRoundIcon}
          title="No patients yet"
          description="Patients you consult will appear here with a link to their history."
        />
      )}

      {all.length > 0 && (
        <TablePanel
          title="Patients"
          count={rows.length}
          page={page}
          pageCount={pageCount}
          onPage={setPage}
          pageSize={pageSize}
          total={total}
          toolbar={
            <>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 w-44 pl-7"
                  placeholder="Search name…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Select value={sort} onValueChange={(v) => v && setSort(v as Sort)}>
                <SelectTrigger className="h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently seen</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="visits">Most visits</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        >
          {rows.length === 0 ? (
            <NoMatches>No patients match “{q}”.</NoMatches>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((p) => {
                  const age = ageFrom(p.dob);
                  const meta = [p.gender, age != null ? `${age} yrs` : null]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/patients/${p.id}/history`}
                          className="flex items-center gap-2.5 text-primary hover:underline"
                        >
                          <Avatar name={p.fullName} size="sm" />
                          {p.fullName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{meta || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{p.visitCount}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDateTime(p.lastVisitedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/patients/${p.id}/history`}
                          className="text-sm text-primary underline underline-offset-4"
                        >
                          History →
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TablePanel>
      )}
    </AppShell>
  );
}

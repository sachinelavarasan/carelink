import type { VisitedDoctor } from '@carelink/shared';
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

type Sort = 'recent' | 'name' | 'visits';

/** Patient's list of doctors they've consulted. Each row opens the full
 *  consultation history with that doctor. */
export default function MyDoctors() {
  const visitedQ = useQuery({
    queryKey: ['my-doctors'],
    queryFn: () => apiGet<VisitedDoctor[]>('/me/doctors'),
  });
  const all = visitedQ.data ?? [];

  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('recent');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? all.filter(
          (d) =>
            d.fullName.toLowerCase().includes(needle) ||
            d.specializations.some((s) => s.toLowerCase().includes(needle)),
        )
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
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">My doctors</h1>
        <Link className="text-sm text-primary underline underline-offset-4" to="/history">
          All history →
        </Link>
      </div>

      {visitedQ.isLoading && <TableSkeleton cols={5} />}
      {visitedQ.isError && <Notice kind="error">Could not load your doctors.</Notice>}
      {visitedQ.data && all.length === 0 && (
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

      {all.length > 0 && (
        <TablePanel
          title="Doctors seen"
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
                  className="h-8 w-48 pl-7"
                  placeholder="Search name or field…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Select value={sort} onValueChange={(v) => v && setSort(v as Sort)}>
                <SelectTrigger className="h-8 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent visit</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="visits">Most visits</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        >
          {rows.length === 0 ? (
            <NoMatches>No doctors match “{q}”.</NoMatches>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead>Last visit</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/my-doctors/${d.id}`}
                        className="flex items-center gap-2.5 text-primary hover:underline"
                      >
                        <Avatar name={d.fullName} size="sm" />
                        {d.fullName}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[28ch] truncate text-muted-foreground">
                      {d.specializations.join(', ') || d.qualifications}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{d.visitCount}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmtDateTime(d.lastVisitedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3 text-sm">
                        <Link
                          className="text-primary underline underline-offset-4"
                          to={`/my-doctors/${d.id}`}
                        >
                          History
                        </Link>
                        <Link
                          className="text-primary underline underline-offset-4"
                          to={`/book?doctorId=${d.id}`}
                        >
                          Book again
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TablePanel>
      )}
    </AppShell>
  );
}

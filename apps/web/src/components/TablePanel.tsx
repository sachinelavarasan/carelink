import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

/** Client-side pagination over an already-fetched list. Resets to page 1
 *  whenever `resetKey` changes (e.g. the active filter). */
export function useClientPaging<T>(
  items: T[],
  opts: { pageSize?: number; resetKey?: unknown } = {},
) {
  const pageSize = opts.pageSize ?? 10;
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [opts.resetKey]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount);
  const pageItems = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize],
  );

  return { page: current, setPage, pageCount, pageItems, pageSize, total: items.length };
}

/** Descendant-table styling — applied by `TablePanel` so `ui/table` stays plain
 *  where it's used bare (e.g. the vitals panel). */
const TABLE_CHROME = cn(
  '[&_thead_th]:h-9 [&_thead_th]:bg-muted/60 [&_thead_th]:text-[0.7rem] [&_thead_th]:font-semibold',
  '[&_thead_th]:uppercase [&_thead_th]:tracking-wider [&_thead_th]:text-muted-foreground',
  '[&_tbody_td]:py-3 [&_tbody_td]:align-middle',
  '[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4',
  '[&_tbody_tr]:border-border/50 [&_tbody_tr:nth-child(even)]:bg-muted/10',
);

/**
 * A filled panel around a data table: a header strip (title + count on the left,
 * filter controls on the right), the table, and a paginator footer.
 */
export function TablePanel({
  title,
  count,
  toolbar,
  children,
  page,
  pageCount,
  onPage,
  pageSize,
  total,
}: {
  title: string;
  count?: number;
  toolbar?: ReactNode;
  children: ReactNode;
  page?: number;
  pageCount?: number;
  onPage?: (page: number) => void;
  pageSize?: number;
  total?: number;
}) {
  const paged = page != null && pageCount != null && onPage != null && pageCount > 1;
  const rangeStart =
    page != null && pageSize != null && total ? (page - 1) * pageSize + 1 : null;
  const rangeEnd =
    page != null && pageSize != null && total ? Math.min(page * pageSize, total) : null;

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-sm', TABLE_CHROME)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {title}
          {count != null && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
      </div>

      {children}

      {paged && (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {rangeStart != null
              ? `${rangeStart}–${rangeEnd} of ${total}`
              : `Page ${page} of ${pageCount}`}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={page! <= 1}
              onClick={() => onPage!(page! - 1)}
            >
              <ChevronLeftIcon /> Prev
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={page! >= pageCount!}
              onClick={() => onPage!(page! + 1)}
            >
              Next <ChevronRightIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** "No rows match the filter" line, shown inside the panel body. */
export function NoMatches({ children = 'No matches.' }: { children?: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Panel-shaped loading placeholder — header strip + skeleton rows. */
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-sm', TABLE_CHROME)}>
      <div className="border-b border-border bg-muted/30 px-4 py-2.5">
        <Skeleton className="h-4 w-28" />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: cols }, (_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-3 w-16" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, r) => (
            <TableRow key={r}>
              {Array.from({ length: cols }, (_, c) => (
                <TableCell key={c}>
                  <Skeleton className={cn('h-4', c === 0 ? 'w-32' : 'w-20')} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

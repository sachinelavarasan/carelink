import Link from 'next/link';

import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd, type Crumb } from '@/lib/seo';

import { ChevronRightIcon } from './icons';

/** Visible breadcrumb trail plus matching BreadcrumbList JSON-LD. Last crumb = current page. */
export function Breadcrumbs({ crumbs, currentPath }: { crumbs: Crumb[]; currentPath: string }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={crumb.name} className="flex items-center gap-1">
                {isLast || !crumb.href ? (
                  <span aria-current={isLast ? 'page' : undefined} className="font-medium text-ink">
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="underline-offset-4 hover:text-brand-800 hover:underline"
                  >
                    {crumb.name}
                  </Link>
                )}
                {!isLast && <ChevronRightIcon className="h-4 w-4 text-slate-400" />}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(crumbs, currentPath)} />
    </>
  );
}

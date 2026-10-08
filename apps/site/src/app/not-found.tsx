import type { Metadata } from 'next';
import Link from 'next/link';

import { ButtonLink } from '@/components/ButtonLink';
import { getCategories } from '@/lib/treatments';

// Next.js adds `noindex` to 404 responses automatically.
export const metadata: Metadata = {
  title: 'Page not found',
};

export default async function NotFound() {
  const categories = await getCategories();

  return (
    <section className="container-page py-16 sm:py-24">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Error 404</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Page not found</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        Sorry, we couldn’t find that page. It may have moved, or the address may be mistyped.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/">Go to the home page</ButtonLink>
        <ButtonLink href="/treatments" variant="secondary">
          Browse treatments
        </ButtonLink>
      </div>

      <h2 className="mt-14 text-xl font-semibold">Treatment categories</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/treatments/${c.slug}`}
              className="text-brand-800 underline-offset-4 hover:underline"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

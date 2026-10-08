import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CategoryIconView } from '@/components/icons';
import { ConditionCard, CtaBanner, PageHero } from '@/components/sections';
import { pageMetadata } from '@/lib/seo';
import { getCategories, getCategory } from '@/lib/treatments';

type Props = { params: Promise<{ category: string }> };

// Only the categories in the data are valid; anything else is a 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory((await params).category);
  if (!category) return {};
  return pageMetadata({
    title: category.seoTitle,
    description: category.seoDescription,
    path: `/treatments/${category.slug}`,
  });
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategory((await params).category);
  if (!category) notFound();

  const others = (await getCategories()).filter((c) => c.slug !== category.slug);
  const path = `/treatments/${category.slug}`;

  return (
    <>
      <PageHero
        eyebrow="Treatments"
        title={category.name}
        lead={category.intro}
        breadcrumbs={
          <Breadcrumbs
            currentPath={path}
            crumbs={[
              { name: 'Home', href: '/' },
              { name: 'Treatments', href: '/treatments' },
              { name: category.name },
            ]}
          />
        }
      />

      <section aria-labelledby="conditions-heading" className="container-page py-14 sm:py-16">
        <h2 id="conditions-heading" className="text-2xl font-semibold sm:text-3xl">
          Conditions we see: {category.name}
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          Select a condition to learn how we approach homoeopathic care for it.
        </p>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {category.conditions.map((c) => (
            <ConditionCard key={c.slug} condition={c} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="other-heading" className="bg-brand-50 py-14">
        <div className="container-page">
          <h2 id="other-heading" className="text-xl font-semibold sm:text-2xl">
            Other treatment categories
          </h2>
          <ul className="mt-6 flex flex-wrap gap-3">
            {others.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/treatments/${c.slug}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-brand-900 shadow-sm ring-1 ring-brand-100 hover:ring-brand-300"
                >
                  <CategoryIconView icon={c.icon} className="h-4 w-4 text-brand-700" />
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBanner />
    </>
  );
}

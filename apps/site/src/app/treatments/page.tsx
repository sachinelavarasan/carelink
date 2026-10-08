import Link from 'next/link';

import { CategoryIconView } from '@/components/icons';
import { CtaBanner, PageHero } from '@/components/sections';
import { siteConfig } from '@/config/site';
import { pageMetadata, titleWithSite } from '@/lib/seo';
import { getCategories } from '@/lib/treatments';

export const metadata = pageMetadata({
  title: titleWithSite('Treatments – Conditions We See'),
  description: `Explore homoeopathic care at ${siteConfig.name}: allergy & respiratory, ENT, skin & hair, bones & joints, digestive, women’s, children’s and mental health, and more.`,
  path: '/treatments',
});

export default async function TreatmentsPage() {
  const categories = await getCategories();

  return (
    <>
      <PageHero
        eyebrow="Treatments"
        title="Conditions we see"
        lead="Homoeopathic care is planned for each person individually. Browse the areas of health we commonly see, or contact us to ask about a concern not listed here."
      />

      <section aria-label="Treatment categories" className="container-page py-14 sm:py-16">
        <ul className="grid gap-6 md:grid-cols-2">
          {categories.map((cat) => (
            <li
              key={cat.slug}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <CategoryIconView icon={cat.icon} />
                </span>
                <div>
                  <h2 className="text-xl font-semibold">
                    <Link
                      href={`/treatments/${cat.slug}`}
                      className="hover:text-brand-700 hover:underline"
                    >
                      {cat.name}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted">{cat.shortDescription}</p>
                </div>
              </div>
              <ul className="mt-5 flex flex-wrap gap-2">
                {cat.conditions.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/conditions/${c.slug}`}
                      className="inline-flex min-h-9 items-center rounded-full bg-brand-50 px-3 text-sm text-brand-900 hover:bg-brand-100"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/treatments/${cat.slug}`}
                className="mt-5 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline"
              >
                View {cat.name} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <CtaBanner />
    </>
  );
}

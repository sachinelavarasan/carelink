import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ButtonLink } from '@/components/ButtonLink';
import { InfoIcon, PhoneIcon } from '@/components/icons';
import { PageHero } from '@/components/sections';
import { disclaimer, siteConfig } from '@/config/site';
import { pageMetadata } from '@/lib/seo';
import { getAllConditions, getCategory, getCondition } from '@/lib/treatments';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const conditions = await getAllConditions();
  return conditions.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const condition = await getCondition((await params).slug);
  if (!condition) return {};
  return pageMetadata({
    title: condition.seoTitle,
    description: condition.seoDescription,
    path: `/conditions/${condition.slug}`,
    type: 'article',
  });
}

export default async function ConditionPage({ params }: Props) {
  const condition = await getCondition((await params).slug);
  if (!condition) notFound();

  const path = `/conditions/${condition.slug}`;
  const primary = condition.categories[0];
  const related = ((await getCategory(primary.slug))?.conditions ?? [])
    .filter((c) => c.slug !== condition.slug)
    .slice(0, 6);

  return (
    <>
      <PageHero
        eyebrow={primary.name}
        title={`Homoeopathic care for ${condition.name}`}
        lead={condition.shortDescription}
        breadcrumbs={
          <Breadcrumbs
            currentPath={path}
            crumbs={[
              { name: 'Home', href: '/' },
              { name: 'Treatments', href: '/treatments' },
              { name: primary.name, href: `/treatments/${primary.slug}` },
              { name: condition.name },
            ]}
          />
        }
      />

      <div className="container-page grid gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="max-w-prose">
          <h2 className="text-2xl font-semibold">Our approach</h2>
          <div className="mt-4 space-y-5 text-base leading-8 text-ink">
            {condition.content.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <aside
            aria-label="Important information"
            className="mt-10 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"
          >
            <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <p>{disclaimer}</p>
          </aside>
        </article>

        <aside
          aria-label="More information"
          className="space-y-6 lg:sticky lg:top-28 lg:self-start"
        >
          <div className="rounded-2xl bg-brand-800 p-6 text-white">
            <h2 className="text-xl font-semibold text-white">Book a consultation</h2>
            <p className="mt-2 text-sm leading-6 text-brand-100">
              Talk to {siteConfig.doctor.name} about {condition.name} and your overall health.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <ButtonLink href="/contact#appointment" variant="light">
                Book Appointment
              </ButtonLink>
              <a
                href={siteConfig.contact.phoneHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/70 px-5 text-sm font-semibold hover:bg-white/10"
              >
                <PhoneIcon className="h-4 w-4" />
                {siteConfig.contact.phone}
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-6">
            <h2 className="font-sans text-base font-semibold text-brand-950">Listed under</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {condition.categories.map((c) => (
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
          </div>

          {related.length > 0 && (
            <div className="rounded-2xl border border-slate-200 p-6">
              <h2 className="font-sans text-base font-semibold text-brand-950">
                Related conditions
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {related.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/conditions/${c.slug}`}
                      className="text-brand-800 underline-offset-4 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

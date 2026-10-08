import { notFound } from 'next/navigation';

import { QuoteIcon } from '@/components/icons';
import { CtaBanner, PageHero } from '@/components/sections';
import { showTestimonials, siteConfig } from '@/config/site';
import { testimonials } from '@/data/testimonials';
import { pageMetadata, titleWithSite } from '@/lib/seo';

export const metadata = pageMetadata({
  title: titleWithSite('Testimonials'),
  description: `Patient experiences at ${siteConfig.name}. Individual experiences vary.`,
  path: '/testimonials',
});

export default function TestimonialsPage() {
  // Hidden until real testimonials are added to src/data/testimonials.ts.
  if (!showTestimonials) notFound();

  return (
    <>
      <PageHero
        eyebrow="Testimonials"
        title="Patient experiences"
        lead="Kind words from people we have cared for. Every person is different, and individual experiences and results vary."
      />

      <section aria-label="Testimonials" className="container-page py-14 sm:py-16">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <li key={t.quote}>
              <figure className="flex h-full flex-col rounded-2xl border border-brand-100 bg-brand-50/50 p-6">
                <QuoteIcon className="h-8 w-8 text-brand-600" />
                <blockquote className="mt-4 flex-1 leading-7 text-ink">
                  <p>{t.quote}</p>
                </blockquote>
                <figcaption className="mt-6 text-sm">
                  <span className="block font-semibold text-brand-950">{t.name}</span>
                  {t.detail && <span className="text-muted">{t.detail}</span>}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-2xl text-sm text-muted">
          Testimonials are shared with patients’ permission and reflect personal experiences. They
          are not a promise of any particular result.
        </p>
      </section>

      <CtaBanner />
    </>
  );
}

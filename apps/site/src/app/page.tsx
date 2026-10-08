import Image from 'next/image';
import Link from 'next/link';

import { ButtonLink } from '@/components/ButtonLink';
import { CalendarIcon, PhoneIcon } from '@/components/icons';
import { JsonLd } from '@/components/JsonLd';
import { CategoryGrid, CtaBanner, SectionHeading, WhyHomoeopathyGrid } from '@/components/sections';
import { siteConfig } from '@/config/site';
import { medicalClinicJsonLd, pageMetadata } from '@/lib/seo';
import { getCategories } from '@/lib/treatments';

export const metadata = pageMetadata({
  title: `${siteConfig.name} – Homoeopathy Care in ${siteConfig.contact.address.city}`,
  description: siteConfig.description,
  path: '/',
});

const steps = [
  {
    title: 'Detailed consultation',
    text: 'We take time to understand your symptoms, history, lifestyle and concerns.',
  },
  {
    title: 'Individualised remedy',
    text: 'Your remedy is chosen for you as a whole person, with clear instructions.',
  },
  {
    title: 'Regular follow-up',
    text: 'We review your progress and adjust your care plan as things change.',
  },
];

export default async function HomePage() {
  const categories = await getCategories();

  return (
    <>
      <JsonLd data={medicalClinicJsonLd()} />

      {/* Hero */}
      <section className="overflow-hidden bg-linear-to-b from-brand-50 via-white to-white">
        <div className="container-page grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
              {siteConfig.name}
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
              Gentle, individualised homoeopathic care in {siteConfig.contact.address.city}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
              Unhurried consultations and personalised treatment plans for adults and children, led
              by {siteConfig.doctor.name}. Homoeopathic care that works alongside your other medical
              care.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/contact#appointment">
                <CalendarIcon className="h-4 w-4" />
                Book Appointment
              </ButtonLink>
              <ButtonLink href="/treatments" variant="secondary">
                Explore treatments
              </ButtonLink>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted">
              <PhoneIcon className="h-4 w-4 text-brand-700" />
              Prefer to talk?{' '}
              <a
                href={siteConfig.contact.phoneHref}
                className="font-semibold text-brand-800 underline-offset-4 hover:underline"
              >
                Call {siteConfig.contact.phone}
              </a>
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <Image
              src="/images/hero-illustration.svg"
              alt="Illustration of a green herbal plant growing from a mortar, with homoeopathic globules beside it"
              width={560}
              height={480}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      {/* Treatment categories */}
      <section aria-labelledby="categories-heading" className="container-page py-14 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            id="categories-heading"
            title="Conditions we see"
            lead="Homoeopathic care across ten areas of health. Choose a category to see the conditions we commonly see."
          />
          <Link
            href="/treatments"
            className="shrink-0 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline"
          >
            View all treatments →
          </Link>
        </div>
        <div className="mt-10">
          <CategoryGrid categories={categories} />
        </div>
      </section>

      {/* Why Homoeopathy */}
      <section aria-labelledby="why-heading" className="bg-brand-50 py-14 sm:py-20">
        <div className="container-page">
          <SectionHeading
            id="why-heading"
            title="Why Homoeopathy"
            lead="A gentle, person-centred approach that many families choose alongside their regular medical care."
            center
          />
          <div className="mt-10">
            <WhyHomoeopathyGrid />
          </div>
          <div className="mt-8 text-center">
            <ButtonLink href="/why-homoeopathy" variant="secondary">
              Learn more about homoeopathy
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="steps-heading" className="container-page py-14 sm:py-20">
        <SectionHeading id="steps-heading" title="What to expect" center />
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-slate-200 p-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <CtaBanner />
    </>
  );
}

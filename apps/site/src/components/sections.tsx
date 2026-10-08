import Link from 'next/link';
import type { ReactNode } from 'react';

import { siteConfig } from '@/config/site';
import { whyHomoeopathy, type WhyIcon } from '@/data/why-homoeopathy';
import type { Category, ConditionSummary } from '@/lib/treatments';

import { ButtonLink } from './ButtonLink';
import {
  ArrowRightIcon,
  CategoryIconView,
  FamilyIcon,
  FeatherIcon,
  HourglassIcon,
  LeafIcon,
  PhoneIcon,
  ShieldIcon,
  UserCheckIcon,
} from './icons';

/** Top-of-page band with the page's single H1. */
export function PageHero({
  title,
  eyebrow,
  lead,
  breadcrumbs,
  children,
}: {
  title: string;
  eyebrow?: string;
  lead?: string;
  breadcrumbs?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-brand-100 bg-linear-to-b from-brand-50 to-white">
      <div className="container-page py-10 sm:py-14">
        {breadcrumbs && <div className="mb-6">{breadcrumbs}</div>}
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">{eyebrow}</p>
        )}
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold sm:text-4xl lg:text-5xl">{title}</h1>
        {lead && <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">{lead}</p>}
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({
  id,
  title,
  lead,
  center = false,
}: {
  id?: string;
  title: string;
  lead?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <h2 id={id} className="text-2xl font-semibold sm:text-3xl">
        {title}
      </h2>
      {lead && <p className="mt-3 text-base leading-7 text-muted">{lead}</p>}
    </div>
  );
}

export function CategoryCard({ category }: { category: Category }) {
  return (
    <li className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-300 hover:shadow-md">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <CategoryIconView icon={category.icon} />
      </span>
      <h3 className="mt-4 text-lg font-semibold">
        <Link href={`/treatments/${category.slug}`} className="after:absolute after:inset-0">
          {category.name}
        </Link>
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">{category.shortDescription}</p>
      <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-brand-800">
        {category.conditions.length} conditions
        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </p>
    </li>
  );
}

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4">
      {categories.map((c) => (
        <CategoryCard key={c.slug} category={c} />
      ))}
    </ul>
  );
}

export function ConditionCard({ condition }: { condition: ConditionSummary }) {
  return (
    <li className="group relative rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm">
      <h3 className="font-sans text-base font-semibold text-brand-950">
        <Link href={`/conditions/${condition.slug}`} className="after:absolute after:inset-0">
          {condition.name}
        </Link>
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted">{condition.shortDescription}</p>
      <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-brand-800">
        Read more
        <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </p>
    </li>
  );
}

const whyIcons: Record<WhyIcon, typeof LeafIcon> = {
  leaf: LeafIcon,
  feather: FeatherIcon,
  user: UserCheckIcon,
  hourglass: HourglassIcon,
  shield: ShieldIcon,
  family: FamilyIcon,
};

export function WhyHomoeopathyGrid({ detailed = false }: { detailed?: boolean }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {whyHomoeopathy.map((point) => {
        const Icon = whyIcons[point.icon];
        return (
          <li
            key={point.title}
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-800">
              <Icon />
            </span>
            <h3 className="mt-4 text-lg font-semibold">{point.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {detailed ? point.detail : point.summary}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function CtaBanner({
  title = 'Book a consultation',
  text = 'Take the first step with an unhurried consultation. Call the clinic or request an appointment and we will get back to you.',
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section aria-labelledby="cta-heading" className="container-page py-14 sm:py-20">
      <div className="rounded-3xl bg-brand-800 px-6 py-10 text-center sm:px-12 sm:py-14">
        <h2 id="cta-heading" className="text-2xl font-semibold text-white sm:text-3xl">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-brand-100">{text}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/contact#appointment" variant="light">
            Book Appointment
          </ButtonLink>
          <a
            href={siteConfig.contact.phoneHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/70 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            <PhoneIcon className="h-4 w-4" />
            Call {siteConfig.contact.phone}
          </a>
        </div>
      </div>
    </section>
  );
}

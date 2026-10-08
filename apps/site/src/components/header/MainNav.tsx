'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { mainNav, siteConfig } from '@/config/site';
import type { CategoryIcon } from '@/lib/treatments';

import {
  ArrowRightIcon,
  CalendarIcon,
  CategoryIconView,
  ChevronDownIcon,
  CloseIcon,
  MenuIcon,
  PhoneIcon,
} from '../icons';

export interface NavCategory {
  slug: string;
  name: string;
  icon: CategoryIcon;
  conditions: { slug: string; name: string }[];
}

interface MainNavProps {
  categories: NavCategory[];
  /** Server-rendered actions (phone, Book Appointment) shown between the nav and the hamburger. */
  children?: ReactNode;
}

const isTreatmentsPath = (path: string) =>
  path.startsWith('/treatments') || path.startsWith('/conditions');

/**
 * Main navigation: desktop links with a Treatments mega-menu, plus a mobile
 * hamburger panel with accordion categories. Uses the disclosure pattern
 * (buttons with aria-expanded) instead of ARIA menus, which suits site navigation.
 */
export function MainNav({ categories, children }: MainNavProps) {
  const pathname = usePathname();
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const megaButtonRef = useRef<HTMLButtonElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const megaId = useId();
  const mobileId = useId();

  // Close everything after navigation (covers back/forward too).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMegaOpen(false);
    setMobileOpen(false);
  }

  // Escape and outside click.
  useEffect(() => {
    if (!megaOpen && !mobileOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (megaOpen) {
        setMegaOpen(false);
        megaButtonRef.current?.focus();
      }
      if (mobileOpen) {
        setMobileOpen(false);
        mobileButtonRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setMegaOpen(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [megaOpen, mobileOpen]);

  // Stop the page scrolling behind the open mobile panel.
  useEffect(() => {
    if (!mobileOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [mobileOpen]);

  const ariaCurrent = (href: string) => (pathname === href ? ('page' as const) : undefined);
  const linkColor = (href: string) => {
    const active =
      href === '/'
        ? pathname === '/'
        : href === '/treatments'
          ? isTreatmentsPath(pathname)
          : pathname.startsWith(href);
    return active ? 'text-brand-800' : 'text-ink hover:text-brand-800';
  };

  // Rendered right after its trigger so Tab moves straight into the panel.
  const close = () => setMegaOpen(false);
  const megaPanel = (
    <div
      id={megaId}
      hidden={!megaOpen}
      onBlur={(e) => {
        // Close when keyboard focus leaves both the panel and its trigger.
        const next = e.relatedTarget as Node | null;
        if (next && !e.currentTarget.contains(next) && next !== megaButtonRef.current) {
          setMegaOpen(false);
        }
      }}
      className="absolute inset-x-0 top-full hidden rounded-b-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 transition-[opacity,translate] duration-200 ease-out starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none xl:block"
    >
      <div className="container-page max-h-[calc(100dvh-5rem)] overflow-y-auto py-6">
        {/* Intro row */}
        <div className="flex items-end justify-between gap-6 border-b border-slate-100 pb-4">
          <div>
            <p className="font-display text-lg font-semibold text-brand-950">Treatments</p>
            <p className="text-sm text-muted">
              Homoeopathic care across {categories.length} areas of health. Choose a condition to
              learn more.
            </p>
          </div>
          <Link
            href="/treatments"
            onClick={close}
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-brand-800 hover:bg-brand-50"
          >
            View all treatments
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Category cards */}
        <ul className="mt-4 grid grid-cols-5 gap-2">
          {categories.map((cat) => (
            <li
              key={cat.slug}
              className="rounded-xl p-3 transition-colors hover:bg-brand-50/70 focus-within:bg-brand-50/70"
            >
              <Link
                href={`/treatments/${cat.slug}`}
                onClick={close}
                className="group flex items-center gap-2.5 rounded-lg"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-700 group-hover:text-white">
                  <CategoryIconView icon={cat.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm leading-tight font-semibold text-brand-950 group-hover:text-brand-800">
                    {cat.name}
                  </span>
                  <span className="block text-xs text-muted">
                    {cat.conditions.length} conditions
                  </span>
                </span>
              </Link>
              <ul className="mt-2.5 space-y-0.5 border-l border-brand-100 pl-3 ml-[1.1rem]">
                {cat.conditions.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/conditions/${c.slug}`}
                      onClick={close}
                      aria-current={pathname === `/conditions/${c.slug}` ? 'page' : undefined}
                      className="-ml-px block border-l-2 border-transparent py-1 pl-2.5 text-sm text-muted transition-colors hover:border-brand-600 hover:text-brand-900 aria-[current=page]:border-brand-600 aria-[current=page]:font-medium aria-[current=page]:text-brand-900"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        {/* Help strip */}
        <div className="mt-4 flex items-center justify-between gap-6 rounded-xl bg-brand-50 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-brand-950">
              Not sure where your concern fits?
            </p>
            <p className="text-sm text-muted">
              Talk to {siteConfig.doctor.name}. We will guide you to the right care.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={siteConfig.contact.phoneHref}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-brand-700 bg-white px-4 text-sm font-semibold text-brand-800 hover:bg-brand-100"
            >
              <PhoneIcon className="h-4 w-4" />
              {siteConfig.contact.phone}
            </a>
            <Link
              href="/contact#appointment"
              onClick={close}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
            >
              <CalendarIcon className="h-4 w-4" />
              Book Appointment
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className="flex min-w-0 flex-1 items-center justify-end gap-2 xl:gap-3">
      {/* Desktop */}
      <nav aria-label="Main" className="hidden flex-1 justify-center xl:flex">
        <ul className="flex items-center 2xl:gap-1">
          {mainNav.map((item) =>
            item.href === '/treatments' ? (
              <li key={item.href}>
                <button
                  ref={megaButtonRef}
                  type="button"
                  aria-expanded={megaOpen}
                  aria-controls={megaId}
                  onClick={() => setMegaOpen((o) => !o)}
                  className={`flex min-h-10 items-center gap-1 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors ${
                    megaOpen ? 'bg-brand-50 text-brand-800' : linkColor('/treatments')
                  }`}
                >
                  {item.label}
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform ${megaOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {megaPanel}
              </li>
            ) : (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={ariaCurrent(item.href)}
                  className={`flex min-h-11 items-center whitespace-nowrap rounded-md px-2 text-sm font-medium 2xl:px-3 ${linkColor(item.href)}`}
                >
                  {item.shortLabel}
                </Link>
              </li>
            ),
          )}
        </ul>
      </nav>

      {children}

      {/* Mobile toggle */}
      <button
        ref={mobileButtonRef}
        type="button"
        aria-expanded={mobileOpen}
        aria-controls={mobileId}
        onClick={() => setMobileOpen((o) => !o)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-brand-900 hover:bg-brand-50 xl:hidden"
      >
        <span className="sr-only">{mobileOpen ? 'Close menu' : 'Open menu'}</span>
        {mobileOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Mobile panel */}
      <div
        id={mobileId}
        hidden={!mobileOpen}
        className="absolute inset-x-0 top-full h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-200 bg-white xl:hidden"
      >
        <nav aria-label="Mobile" className="container-page py-4">
          <ul className="divide-y divide-slate-100">
            {mainNav.map((item) =>
              item.href === '/treatments' ? (
                <li key={item.href} className="py-2">
                  <Link
                    href="/treatments"
                    aria-current={ariaCurrent('/treatments')}
                    className={`block py-2 text-base font-semibold ${linkColor('/treatments')}`}
                  >
                    All Treatments
                  </Link>
                  <ul className="mt-1 space-y-1">
                    {categories.map((cat) => (
                      <MobileCategory
                        key={cat.slug}
                        category={cat}
                        open={openCategory === cat.slug}
                        onToggle={() =>
                          setOpenCategory((cur) => (cur === cat.slug ? null : cat.slug))
                        }
                      />
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={ariaCurrent(item.href)}
                    className={`block py-3 text-base font-semibold ${linkColor(item.href)}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>
      </div>
    </div>
  );
}

function MobileCategory({
  category,
  open,
  onToggle,
}: {
  category: NavCategory;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  return (
    <li className="rounded-lg bg-slate-50">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm font-medium text-ink"
      >
        {category.name}
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <ul id={panelId} hidden={!open} className="space-y-1 px-3 pb-3">
        <li>
          <Link
            href={`/treatments/${category.slug}`}
            className="block py-1.5 text-sm font-semibold text-brand-800"
          >
            Overview: {category.name}
          </Link>
        </li>
        {category.conditions.map((c) => (
          <li key={c.slug}>
            <Link href={`/conditions/${c.slug}`} className="block py-1.5 text-sm text-muted">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

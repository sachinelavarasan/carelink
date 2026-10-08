import Link from 'next/link';

import { siteConfig } from '@/config/site';
import { getCategories } from '@/lib/treatments';

import { CalendarIcon, PhoneIcon } from '../icons';
import { Logo } from '../Logo';
import { MainNav, type NavCategory } from './MainNav';

export async function Header() {
  const categories = await getCategories();
  // Send the client nav only what it renders.
  const navCategories: NavCategory[] = categories.map(({ slug, name, icon, conditions }) => ({
    slug,
    name,
    icon,
    conditions: conditions.map(({ slug, name }) => ({ slug, name })),
  }));

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/85">
      <div className="container-page relative flex h-16 max-w-7xl! items-center gap-3 xl:h-20">
        <Logo />
        <MainNav categories={navCategories}>
          <a
            href={siteConfig.contact.phoneHref}
            className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold text-brand-800 hover:bg-brand-50 2xl:px-3"
          >
            <PhoneIcon className="h-5 w-5 shrink-0" />
            <span className="sr-only 2xl:not-sr-only">
              <span className="2xl:hidden">Call </span>
              {siteConfig.contact.phone}
            </span>
          </a>
          <Link
            href="/contact#appointment"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
          >
            <CalendarIcon className="hidden h-4 w-4 shrink-0 2xl:block" />
            <span>
              Book<span className="hidden sm:inline"> Appointment</span>
            </span>
          </Link>
        </MainNav>
      </div>
    </header>
  );
}

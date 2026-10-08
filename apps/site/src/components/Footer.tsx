import Link from 'next/link';

import { disclaimer, fullAddress, mainNav, siteConfig } from '@/config/site';
import { getCategories } from '@/lib/treatments';

import { ChatIcon, ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from './icons';
import { LogoMark } from './Logo';

export async function Footer() {
  const categories = await getCategories();
  const { contact } = siteConfig;

  return (
    <footer className="bg-brand-950 text-brand-100">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <p className="font-display text-lg font-semibold text-white">{siteConfig.name}</p>
          </div>
          <p className="mt-4 text-sm leading-6 text-brand-200">
            {siteConfig.tagline} for every member of the family, led by {siteConfig.doctor.name}.
          </p>
        </div>

        <nav aria-labelledby="footer-quick-links">
          <h2 id="footer-quick-links" className="font-sans text-sm font-semibold text-white">
            Quick links
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-treatments">
          <h2 id="footer-treatments" className="font-sans text-sm font-semibold text-white">
            Treatment categories
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {categories.map((cat) => (
              <li key={cat.slug}>
                <Link href={`/treatments/${cat.slug}`} className="hover:text-white hover:underline">
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-sans text-sm font-semibold text-white">Contact</h2>
          <address className="mt-4 space-y-3 text-sm not-italic">
            <p className="flex gap-2">
              <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{fullAddress}</span>
            </p>
            <p className="flex gap-2">
              <PhoneIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <a href={contact.phoneHref} className="hover:text-white hover:underline">
                {contact.phone}
              </a>
            </p>
            {contact.whatsappHref && (
              <p className="flex gap-2">
                <ChatIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <a
                  href={contact.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white hover:underline"
                >
                  WhatsApp<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            )}
            <p className="flex gap-2">
              <MailIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <a href={`mailto:${contact.email}`} className="hover:text-white hover:underline">
                {contact.email}
              </a>
            </p>
            <div className="flex gap-2">
              <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <ul>
                {contact.timings.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </address>
        </div>
      </div>

      <div className="border-t border-brand-800">
        <div className="container-page py-6">
          <p className="rounded-lg bg-brand-900 p-4 text-sm leading-6 text-brand-100">
            <strong className="text-white">Disclaimer: </strong>
            {disclaimer}
          </p>
          <p className="mt-4 text-xs text-brand-200">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

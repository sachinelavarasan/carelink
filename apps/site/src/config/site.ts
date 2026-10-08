import { testimonials } from '@/data/testimonials';

/**
 * Clinic-wide settings. Nothing else in the codebase hard-codes these.
 * Optional fields left empty ('' or []) are hidden on the site until filled in.
 */
export const siteConfig = {
  name: 'Harivin Multispecialty Homeo Clinic',
  shortName: 'Harivin Homeo Clinic',
  tagline: 'Gentle, individualised homoeopathic care',
  description:
    'Harivin Multispecialty Homeo Clinic offers individualised homoeopathic care for allergies, skin, joint, digestive, women’s, children’s and mental health concerns in Salem.',

  /**
   * Public origin used for canonical URLs, Open Graph tags, the sitemap and JSON-LD.
   * Set NEXT_PUBLIC_SITE_URL in the deployment environment (no trailing slash).
   */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.example.com').replace(/\/$/, ''),
  locale: 'en_IN',

  doctor: {
    name: 'Dr. D. Vinotha',
    qualifications: 'BHMS',
    /** Leave empty to hide the line on the About page. */
    registration: '' as string,
    /** Photo in /public, e.g. '/images/dr-vinotha.jpg' (portrait, ~400×480). Empty = no photo. */
    photo: '' as string,
    /** About page: doctor's introduction, one string per paragraph. Empty = hidden. */
    bio: [] as string[],
  },

  /** About page: the clinic's story, one string per paragraph. Empty = hidden. */
  clinicStory: [] as string[],

  contact: {
    /** Shown on the page. */
    phone: '+91 88076 11481',
    /** Used in tel: links: digits only with country code, e.g. +919876543210. */
    phoneHref: 'tel:+918807611481',
    /** WhatsApp click-to-chat link (same number). Leave empty to hide. */
    whatsappHref: 'https://wa.me/918807611481' as string,
    email: 'editorharihasd@gmail.com',
    address: {
      street: 'Kondappanaickenpatti, Yercaud Adivaram',
      city: 'Salem',
      region: 'Tamil Nadu',
      postalCode: '636010',
      country: 'IN',
    },
    /** One line per row, shown as-is. Keep `openingHours` below in sync. */
    timings: ['Mon–Sat: 10:00 am – 1:00 pm, 5:00 pm – 8:00 pm', 'Sunday: Closed'],
    /** Machine-readable version of `timings` for search engines (24-hour clock). */
    openingHours: [
      {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '13:00',
      },
      {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '17:00',
        closes: '20:00',
      },
    ],
    /** Google Maps embed URL (Share → Embed a map → the src="…" value). Empty = map hidden. */
    mapUrl: '' as string,
  },
} as const;

export type SiteConfig = typeof siteConfig;

export const fullAddress = [
  siteConfig.contact.address.street,
  siteConfig.contact.address.city,
  siteConfig.contact.address.region,
  siteConfig.contact.address.postalCode,
].join(', ');

export const disclaimer =
  'Homoeopathy is a complementary system of medicine. Results vary between individuals. Please consult a qualified doctor for diagnosis, and do not stop prescribed medication without medical advice.';

/**
 * Testimonials stay hidden (menu, footer, sitemap, and the page itself 404s)
 * until at least one is added to src/data/testimonials.ts.
 */
export const showTestimonials = testimonials.length > 0;

/** `shortLabel` is used in the desktop bar, where the Book Appointment button sits beside it. */
export const mainNav = [
  { label: 'Home', shortLabel: 'Home', href: '/' },
  { label: 'About Us', shortLabel: 'About Us', href: '/about' },
  { label: 'Treatments', shortLabel: 'Treatments', href: '/treatments' },
  { label: 'Why Homoeopathy', shortLabel: 'Why Homoeopathy', href: '/why-homoeopathy' },
  ...(showTestimonials
    ? [{ label: 'Testimonials', shortLabel: 'Testimonials', href: '/testimonials' }]
    : []),
  { label: 'Contact / Book Appointment', shortLabel: 'Contact', href: '/contact' },
];

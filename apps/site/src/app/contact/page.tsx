import { AppointmentForm } from '@/components/AppointmentForm';
import { ChatIcon, ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from '@/components/icons';
import { JsonLd } from '@/components/JsonLd';
import { PageHero } from '@/components/sections';
import { fullAddress, siteConfig } from '@/config/site';
import { medicalClinicJsonLd, pageMetadata, titleWithSite } from '@/lib/seo';
import { getAllConditions, getCategories } from '@/lib/treatments';

export const metadata = pageMetadata({
  title: titleWithSite('Contact & Book Appointment'),
  description: `Contact ${siteConfig.name} in ${siteConfig.contact.address.city}. Find our address, phone number and clinic timings, or request an appointment.`,
  path: '/contact',
});

export default async function ContactPage() {
  // Dropdown options grouped by each condition's primary category, so each appears once.
  const [categories, conditions] = await Promise.all([getCategories(), getAllConditions()]);
  const concernGroups = categories
    .map((cat) => ({
      label: cat.name,
      options: conditions
        .filter((c) => c.categories[0].slug === cat.slug)
        .map(({ slug, name }) => ({ slug, name })),
    }))
    .filter((g) => g.options.length > 0);
  const { contact } = siteConfig;

  return (
    <>
      <JsonLd data={medicalClinicJsonLd()} />
      <PageHero
        eyebrow="Contact"
        title="Contact us & book an appointment"
        lead="Call the clinic, visit us, or send an appointment request below."
      />

      <div className="container-page grid gap-12 py-12 sm:py-16 lg:grid-cols-[2fr_3fr]">
        <section aria-labelledby="details-heading" className="space-y-8">
          <h2 id="details-heading" className="text-2xl font-semibold">
            Clinic details
          </h2>
          <address className="space-y-5 not-italic">
            <div className="flex gap-3">
              <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <div>
                <p className="font-semibold text-brand-950">Address</p>
                <p className="text-muted">{fullAddress}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <PhoneIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <div>
                <p className="font-semibold text-brand-950">Phone</p>
                <a
                  href={contact.phoneHref}
                  className="text-brand-800 underline-offset-4 hover:underline"
                >
                  {contact.phone}
                </a>
              </div>
            </div>
            {contact.whatsappHref && (
              <div className="flex gap-3">
                <ChatIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                <div>
                  <p className="font-semibold text-brand-950">WhatsApp</p>
                  <a
                    href={contact.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-800 underline-offset-4 hover:underline"
                  >
                    Message us on WhatsApp
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <MailIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <div>
                <p className="font-semibold text-brand-950">Email</p>
                <a
                  href={`mailto:${contact.email}`}
                  className="text-brand-800 underline-offset-4 hover:underline"
                >
                  {contact.email}
                </a>
              </div>
            </div>
            <div className="flex gap-3">
              <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <div>
                <p className="font-semibold text-brand-950">Timings</p>
                <ul className="text-muted">
                  {contact.timings.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </address>

          {contact.mapUrl && (
            <iframe
              src={contact.mapUrl}
              title={`Map showing the location of ${siteConfig.name}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-4/3 w-full rounded-2xl border-0"
            />
          )}
        </section>

        <section
          id="appointment"
          aria-labelledby="appointment-heading"
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <h2 id="appointment-heading" className="text-2xl font-semibold">
            Request an appointment
          </h2>
          <p className="mt-2 mb-6 text-muted">
            Share a few details and the clinic will contact you to confirm a time.
          </p>
          <AppointmentForm
            concernGroups={concernGroups}
            phone={contact.phone}
            phoneHref={contact.phoneHref}
          />
        </section>
      </div>
    </>
  );
}

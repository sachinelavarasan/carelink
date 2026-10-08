import Image from 'next/image';

import { CtaBanner, PageHero } from '@/components/sections';
import { siteConfig } from '@/config/site';
import { pageMetadata, titleWithSite } from '@/lib/seo';

export const metadata = pageMetadata({
  title: titleWithSite('About Us'),
  description: `Meet ${siteConfig.doctor.name} and learn about ${siteConfig.name}, offering individualised homoeopathic care for the whole family in ${siteConfig.contact.address.city}.`,
  path: '/about',
});

const values = [
  {
    title: 'Time to listen',
    text: 'First consultations are unhurried, so we can understand you, not just your symptoms.',
  },
  {
    title: 'Honest guidance',
    text: 'We explain what homoeopathic care can and cannot offer, and when you should see another doctor.',
  },
  {
    title: 'Working together',
    text: 'We encourage you to continue care with your other doctors and keep them informed.',
  },
  {
    title: 'Privacy and respect',
    text: 'Your health information is kept confidential and handled with care.',
  },
];

export default function AboutPage() {
  const { doctor } = siteConfig;

  return (
    <>
      <PageHero
        eyebrow="About Us"
        title={`About ${siteConfig.name}`}
        lead="A calm, welcoming clinic offering individualised homoeopathic care for every member of the family."
      />

      <section aria-labelledby="doctor-heading" className="container-page py-14 sm:py-20">
        <div
          className={
            doctor.photo ? 'grid items-start gap-10 md:grid-cols-[2fr_3fr] lg:gap-16' : 'max-w-3xl'
          }
        >
          {doctor.photo && (
            <Image
              src={doctor.photo}
              alt={`Portrait of ${doctor.name}`}
              width={400}
              height={480}
              className="mx-auto h-auto w-full max-w-sm rounded-3xl"
            />
          )}
          <div>
            <h2 id="doctor-heading" className="text-2xl font-semibold sm:text-3xl">
              {doctor.name}
            </h2>
            <p className="mt-1 font-medium text-brand-800">{doctor.qualifications}</p>
            {doctor.registration && (
              <p className="mt-1 text-sm text-muted">Registration no.: {doctor.registration}</p>
            )}
            <div className="mt-6 space-y-4 leading-7 text-muted">
              {[...doctor.bio, ...siteConfig.clinicStory].map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p>
                Every consultation begins with a careful case history. We look at your symptoms
                together with your general health, lifestyle and emotional wellbeing, and plan
                treatment for you as an individual.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="values-heading" className="bg-brand-50 py-14 sm:py-20">
        <div className="container-page">
          <h2 id="values-heading" className="text-2xl font-semibold sm:text-3xl">
            How we work
          </h2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <li
                key={v.title}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-brand-100"
              >
                <h3 className="text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBanner />
    </>
  );
}

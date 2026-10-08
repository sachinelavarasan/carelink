import { CtaBanner, PageHero, SectionHeading, WhyHomoeopathyGrid } from '@/components/sections';
import { siteConfig } from '@/config/site';
import { pageMetadata, titleWithSite } from '@/lib/seo';

export const metadata = pageMetadata({
  title: titleWithSite('Why Homoeopathy'),
  description: `Why families choose homoeopathy: natural, gentle, individualised treatment and long-term care for all age groups at ${siteConfig.name}.`,
  path: '/why-homoeopathy',
});

const faqs = [
  {
    q: 'What happens at the first consultation?',
    a: 'The first visit is longer than a follow-up. The doctor asks about your main complaint, your general health, sleep, appetite, emotional wellbeing and medical history. Please bring any reports and a list of the medicines you take.',
  },
  {
    q: 'Can I take homoeopathic medicines with my other medicines?',
    a: 'Many people do. Tell the doctor about every medicine and supplement you take. Do not stop or change prescribed medication without advice from the doctor who prescribed it.',
  },
  {
    q: 'How long will treatment take?',
    a: 'It depends on the person and the condition. Recent, short-term complaints are usually reviewed sooner; long-standing concerns typically need regular follow-up over a longer period. The doctor will discuss a review plan with you.',
  },
  {
    q: 'Is homoeopathy suitable for children and older people?',
    a: 'We see patients of all ages. Remedies are easy to take, and consultations are adapted for children, with parents closely involved.',
  },
  {
    q: 'When should I see another doctor instead?',
    a: 'Homoeopathy is a complementary system of medicine. For emergencies, severe or rapidly worsening symptoms, or anything new and unexplained, please seek prompt medical care for diagnosis.',
  },
];

export default function WhyHomoeopathyPage() {
  return (
    <>
      <PageHero
        eyebrow="Why Homoeopathy"
        title="A gentle, individualised approach to health"
        lead="Homoeopathy looks at the whole person: your symptoms, temperament, lifestyle and history. Here is what that means for your care."
      />

      <section aria-labelledby="principles-heading" className="bg-brand-50 py-14 sm:py-20">
        <div className="container-page">
          <SectionHeading
            id="principles-heading"
            title="What makes homoeopathic care different"
            center
          />
          <div className="mt-10">
            <WhyHomoeopathyGrid detailed />
          </div>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="container-page py-14 sm:py-20">
        <SectionHeading id="faq-heading" title="Common questions" />
        <div className="mt-8 max-w-3xl divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {faqs.map((f) => (
            <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-brand-950">
                {f.q}
                <span
                  aria-hidden="true"
                  className="text-xl leading-none text-brand-700 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 leading-7 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <CtaBanner />
    </>
  );
}

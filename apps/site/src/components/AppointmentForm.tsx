'use client';

import { useState, type FormEvent } from 'react';

import { ChevronDownIcon } from './icons';

interface ConcernGroup {
  /** Treatment category name, shown as the group heading. */
  label: string;
  options: { slug: string; name: string }[];
}

interface AppointmentFormProps {
  /** "Main concern" dropdown options, grouped by treatment category. */
  concernGroups: ConcernGroup[];
  phone: string;
  phoneHref: string;
}

const field =
  'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-ink shadow-sm placeholder:text-slate-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30';
const label = 'block text-sm font-medium text-ink';

/**
 * UI-only appointment request form. There is no backend yet. On submit it just
 * shows a "coming soon" message. Later: POST to an API route / server action.
 */
export function AppointmentForm({ concernGroups, phone, phoneHref }: AppointmentFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [concern, setConcern] = useState('');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: send to /api/appointments once the backend exists.
    setSubmitted(true);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" aria-describedby="form-note">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={label}>
            Full name <span aria-hidden="true">*</span>
          </label>
          <input id="name" name="name" type="text" autoComplete="name" required className={field} />
        </div>
        <div>
          <label htmlFor="phone" className={label}>
            Phone number <span aria-hidden="true">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            required
            className={field}
          />
        </div>
        <div>
          <label htmlFor="email" className={label}>
            Email <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="email" name="email" type="email" autoComplete="email" className={field} />
        </div>
        <div>
          <label htmlFor="date" className={label}>
            Preferred date
          </label>
          <input id="date" name="date" type="date" className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="concern" className={label}>
          Main concern <span className="font-normal text-muted">(optional)</span>
        </label>
        {/* Native <select> for accessibility and the phone's own picker; styled with a custom chevron. */}
        <div className="relative mt-1.5">
          <select
            id="concern"
            name="concern"
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            aria-describedby="concern-hint"
            className={`block w-full cursor-pointer appearance-none truncate rounded-lg border py-2.5 pr-11 pl-3 text-base shadow-sm transition-colors hover:border-brand-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30 ${
              concern
                ? 'border-brand-300 bg-brand-50 font-medium text-brand-950'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            <option value="">Select a condition</option>
            {concernGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
            <optgroup label="Something else">
              <option value="other">Other / not sure</option>
            </optgroup>
          </select>
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-1.5 right-1.5 flex w-8 items-center justify-center rounded-md transition-colors ${
              concern ? 'bg-brand-700 text-white' : 'bg-brand-50 text-brand-700'
            }`}
          >
            <ChevronDownIcon className="h-4 w-4" />
          </span>
        </div>
        <p id="concern-hint" className="mt-1.5 text-sm text-muted">
          Listed by treatment category. Not sure? Pick “Other / not sure” at the end.
        </p>
      </div>

      <div>
        <label htmlFor="message" className={label}>
          Message <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea id="message" name="message" rows={4} className={field} />
      </div>

      <div className="flex gap-3">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          required
          className="mt-1 h-5 w-5 shrink-0 rounded border-slate-400 accent-brand-700"
        />
        <label htmlFor="consent" className="text-sm leading-6 text-muted">
          I agree to be contacted by the clinic about my appointment request.{' '}
          <span aria-hidden="true">*</span>
        </label>
      </div>

      <p id="form-note" className="text-sm text-muted">
        Fields marked * are required. Please do not use this form for emergencies.
      </p>

      <button
        type="submit"
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand-700 px-6 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-800 sm:w-auto"
      >
        Request appointment
      </button>

      <div role="status" aria-live="polite">
        {submitted && (
          <p className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm leading-6 text-brand-950">
            <strong>Online booking is coming soon.</strong> Your request has not been sent. To book
            now, please call us on{' '}
            <a href={phoneHref} className="font-semibold underline">
              {phone}
            </a>
            .
          </p>
        )}
      </div>
    </form>
  );
}

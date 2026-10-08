/**
 * Patient testimonials for /testimonials. Add only genuine testimonials shared
 * with the patient's written consent. While this list is empty, Testimonials is
 * hidden everywhere (menu, footer, sitemap; /testimonials returns 404). Adding the
 * first entry brings it all back automatically.
 *
 * Example:
 *   { quote: 'The doctor took time to listen…', name: 'R. K.', detail: 'Salem, 2026' },
 */
export interface Testimonial {
  quote: string;
  /** Name or initials, as the patient agreed. */
  name: string;
  /** Optional context, e.g. place or year. */
  detail?: string;
}

export const testimonials: Testimonial[] = [];

import type { MetadataRoute } from 'next';

import { showTestimonials } from '@/config/site';
import { absoluteUrl } from '@/lib/seo';
import { getAllConditions, getCategories } from '@/lib/treatments';

const staticRoutes = [
  '/',
  '/about',
  '/treatments',
  '/why-homoeopathy',
  ...(showTestimonials ? ['/testimonials'] : []),
  '/contact',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, conditions] = await Promise.all([getCategories(), getAllConditions()]);
  const lastModified = new Date();

  return [
    ...staticRoutes.map((path) => ({
      url: absoluteUrl(path),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: path === '/' ? 1 : 0.8,
    })),
    ...categories.map((c) => ({
      url: absoluteUrl(`/treatments/${c.slug}`),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    // One entry per condition, even if it is listed in several categories.
    ...conditions.map((c) => ({
      url: absoluteUrl(`/conditions/${c.slug}`),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}

/**
 * Data-access layer for treatment categories and conditions.
 *
 * Pages and components must read treatment data ONLY through these functions.
 * They are async on purpose: when the data moves to a database, replace the
 * bodies (e.g. with SQL/ORM queries) and keep the signatures. No page needs to
 * change. `cache()` de-duplicates calls within a single render (for example
 * generateMetadata + the page component).
 */
import { cache } from 'react';

import {
  categories as categoryRecords,
  conditions as conditionRecords,
  type CategoryRecord,
  type ConditionRecord,
} from '@/data/treatments';

export type { CategoryIcon } from '@/data/treatments';

export type ConditionSummary = Pick<ConditionRecord, 'slug' | 'name' | 'shortDescription'>;
export type CategorySummary = Pick<CategoryRecord, 'slug' | 'name'>;

export type Category = CategoryRecord & { conditions: ConditionSummary[] };
export type Condition = ConditionRecord & {
  /** Resolved `categorySlugs`, in the same order (first = primary). */
  categories: CategorySummary[];
};

// Fail the build early if the data file has a typo, rather than ship broken links.
validate(categoryRecords, conditionRecords);

const toConditionSummary = ({
  slug,
  name,
  shortDescription,
}: ConditionRecord): ConditionSummary => ({
  slug,
  name,
  shortDescription,
});

function withConditions(category: CategoryRecord): Category {
  return {
    ...category,
    conditions: conditionRecords
      .filter((c) => c.categorySlugs.includes(category.slug))
      .map(toConditionSummary),
  };
}

function withCategories(condition: ConditionRecord): Condition {
  return {
    ...condition,
    categories: condition.categorySlugs.map((slug) => {
      const { name } = categoryRecords.find((c) => c.slug === slug)!;
      return { slug, name };
    }),
  };
}

/** All categories, in menu order, each with its conditions. */
export const getCategories = cache(async (): Promise<Category[]> => {
  return categoryRecords.map(withConditions);
});

export const getCategory = cache(async (slug: string): Promise<Category | null> => {
  const category = categoryRecords.find((c) => c.slug === slug);
  return category ? withConditions(category) : null;
});

export const getCondition = cache(async (slug: string): Promise<Condition | null> => {
  const condition = conditionRecords.find((c) => c.slug === slug);
  return condition ? withCategories(condition) : null;
});

/** Every condition exactly once (canonical pages), in data order. */
export const getAllConditions = cache(async (): Promise<Condition[]> => {
  return conditionRecords.map(withCategories);
});

function validate(cats: CategoryRecord[], conds: ConditionRecord[]) {
  const errors: string[] = [];
  const catSlugs = new Set<string>();
  for (const c of cats) {
    if (catSlugs.has(c.slug)) errors.push(`Duplicate category slug "${c.slug}"`);
    catSlugs.add(c.slug);
  }
  const condSlugs = new Set<string>();
  for (const c of conds) {
    if (condSlugs.has(c.slug)) errors.push(`Duplicate condition slug "${c.slug}"`);
    condSlugs.add(c.slug);
    if (c.categorySlugs.length === 0) errors.push(`Condition "${c.slug}" has no categories`);
    for (const s of c.categorySlugs) {
      if (!catSlugs.has(s)) errors.push(`Condition "${c.slug}" references unknown category "${s}"`);
    }
  }
  if (errors.length) throw new Error(`Invalid treatments data:\n${errors.join('\n')}`);
}

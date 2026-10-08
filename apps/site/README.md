# Harivin Multispecialty Homeo Clinic — website (`apps/site`)

Public marketing website for Harivin Multispecialty Homeo Clinic. It lives in the CareLink
monorepo as the `@carelink/site` workspace, alongside the existing `apps/web`,
`apps/mobile` and `apps/api`, but does not depend on them.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · `next/font` · `next/image`

Every page is pre-rendered at build time (`generateStaticParams` for the dynamic
routes, with `dynamicParams = false`, so unknown slugs return a real 404). We
deliberately do **not** use `output: 'export'`: ISR, a database and API routes are
planned, and they all need the Next.js server.

## Running it

Requires Node 20+ and npm 10+. From the repo root:

```bash
npm install                                   # installs all workspaces
npm run dev   --workspace @carelink/site      # http://localhost:3001
npm run build --workspace @carelink/site      # production build
npm run start --workspace @carelink/site      # serve the build on :3001
npm run lint  --workspace @carelink/site
npm run typecheck --workspace @carelink/site
```

Or `cd apps/site` and use `npm run dev` / `build` / `start` directly.

### Environment

| Variable               | Purpose                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Public origin, e.g. `https://www.shanthihomoeopathy.in` (no trailing slash). Used for canonical URLs, Open Graph, sitemap, robots and JSON-LD. Defaults to `https://www.example.com`. |

### Deploying

Deployed on Vercel as its own project, separate from `apps/web` and `apps/api`.
Settings live in [`vercel.json`](vercel.json):

| Setting         | Value                                   | Why                                                                 |
| --------------- | --------------------------------------- | ------------------------------------------------------------------- |
| `framework`     | `nextjs`                                | Vercel's Next.js runtime (static pages now, ISR/API routes later).  |
| `buildCommand`  | `npm run build --workspace @carelink/site` from the repo root | Same pattern as `apps/web`.                    |
| `ignoreCommand` | `npx turbo-ignore @carelink/site`       | Skips the deploy when a commit only touches other apps (api, mobile, web). |
| `regions`       | `bom1` (Mumbai)                         | Closest region to Salem for future server functions.                |
| `headers`       | Security headers; 1-day cache on `/images/*` | `/_next/static` is already cached long-term by Next.js.       |

One-time setup in the Vercel dashboard (**Add New → Project**, import this repo):

1. **Root Directory:** `apps/site`. Vercel detects the npm workspace and installs from the repo root.
2. **Environment variable:** `NEXT_PUBLIC_SITE_URL` = the live domain, e.g.
   `https://www.harivinhomeo.in` (no trailing slash), for Production. It's used for
   canonical URLs, Open Graph tags, the sitemap and robots.txt, so set it **before** the
   first production deploy.
3. **Domains:** add the clinic's domain under Settings → Domains.

## Where to edit things

| What                                              | File                                   |
| ------------------------------------------------- | -------------------------------------- |
| Clinic name, doctor, phone, WhatsApp, email, address, timings, map, disclaimer, main nav labels | `src/config/site.ts` |
| Doctor photo, doctor bio, clinic story (About page) — hidden while empty | `src/config/site.ts` (`doctor.photo`, `doctor.bio`, `clinicStory`) |
| Treatment categories and conditions (menu, pages, sitemap) | `src/data/treatments.ts`      |
| "Why Homoeopathy" points                          | `src/data/why-homoeopathy.ts`          |
| Testimonials (hidden from menu, footer and sitemap while empty) | `src/data/testimonials.ts`           |
| Page text (home, about, FAQs…)                    | `src/app/**/page.tsx`                  |
| Colours and fonts                                 | `src/app/globals.css`, `src/app/layout.tsx` |
| Images                                            | `public/images/` (hero illustration; put the doctor photo here too) |
| Favicon / social-share image                      | `src/app/icon.svg`, `src/app/opengraph-image.tsx` |

### Adding or editing a condition

Open `src/data/treatments.ts` and add a `condition({...})` entry:

```ts
condition({
  slug: 'sinusitis',                              // URL: /conditions/sinusitis
  name: 'Sinusitis',
  categorySlugs: ['allergy-respiratory', 'ent'],  // first = primary (breadcrumbs)
  shortDescription: 'Homoeopathic care for …',
  phrase: 'sinusitis',                            // optional: how it reads mid-sentence
  note: 'Seek urgent care if …',                  // optional safety note
}),
```

- A condition listed under several categories gets **one** canonical page
  (`/conditions/{slug}`); each category links to it.
- Within a category, conditions are listed in the order they appear in the file.
- The `content` paragraphs are currently **generic placeholders** generated by
  `placeholderContent()`. Replace them with text written or reviewed by the
  doctor by giving the record its own `content: [...]` array.
- The build fails with a clear message if a slug is duplicated or a condition
  points to a category that doesn't exist.

### Wording rules

Use neutral wording ("Homoeopathic care for {condition}", "Conditions we see").
Never use "cure", "guaranteed", "permanent relief" or "100% safe". The site-wide
disclaimer (in `src/config/site.ts`) appears in the footer and on every
condition page.

## Architecture

```
src/
  app/                     routes (App Router), sitemap.ts, robots.ts, OG image, 404
  components/              Header/MainNav, Footer, Breadcrumbs, sections, form, icons
  config/site.ts           clinic details and placeholders
  data/treatments.ts       categories + conditions (the current "database")
  data/why-homoeopathy.ts
  lib/treatments.ts        data-access layer: getCategories, getCategory,
                           getCondition, getAllConditions
  lib/seo.ts               metadata builder + JSON-LD helpers
```

- **Server Components by default.** Only two client components ship JS:
  `components/header/MainNav.tsx` (mega-menu, mobile menu) and
  `components/AppointmentForm.tsx` (shows the "coming soon" message on submit).
- **SEO:** each page sets a unique title, description, canonical, Open Graph and
  Twitter tags through `pageMetadata()` in `src/lib/seo.ts`. JSON-LD:
  `MedicalClinic` on `/` and `/contact`, `BreadcrumbList` on category and
  condition pages (rendered by `<Breadcrumbs>`).

## Where the database plugs in later

Pages never import `src/data/treatments.ts` directly. They only call the async
functions in **`src/lib/treatments.ts`**:

```ts
getCategories()        // all categories, each with its conditions
getCategory(slug)      // one category with its conditions, or null
getCondition(slug)     // one condition with its resolved categories, or null
getAllConditions()     // every condition once (canonical pages)
```

To move to a database (e.g. the Postgres/Drizzle setup used by `apps/api`):

1. Create tables such as `categories`, `conditions` and a join table
   `condition_categories (condition_id, category_id, position)`.
2. Seed them from `src/data/treatments.ts`.
3. Re-implement the four functions above with queries, returning the same
   types (`Category`, `Condition`). No page or component changes are needed.
4. Turn on ISR by adding `export const revalidate = 3600` (or on-demand
   `revalidatePath` / `revalidateTag` from an admin API route) to the treatment
   and condition routes. Optionally set `dynamicParams = true` so new
   conditions render on first request without a rebuild.

The appointment form (`AppointmentForm.tsx`) has a `TODO` where it should POST
to a future `src/app/api/appointments/route.ts` or a Server Action.

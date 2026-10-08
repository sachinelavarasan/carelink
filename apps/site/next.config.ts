import type { NextConfig } from 'next';

// No `output: 'export'` on purpose: ISR, a database and API routes are planned,
// and all of those need the Next.js server. Pages are still pre-rendered at
// build time via generateStaticParams.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;

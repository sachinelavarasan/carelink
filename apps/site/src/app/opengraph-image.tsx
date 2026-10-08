import { ImageResponse } from 'next/og';

import { siteConfig } from '@/config/site';

// Default social-share image, generated at build time and inherited by every page.
export const alt = `${siteConfig.name} – ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        background: 'linear-gradient(135deg, #effaf6 0%, #b3e4d4 100%)',
        color: '#0a2622',
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 28,
          background: '#196356',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '0 50% 0 50%',
            background: '#d8f2e9',
          }}
        />
      </div>
      <div style={{ marginTop: 48, fontSize: 72, fontWeight: 700 }}>{siteConfig.name}</div>
      <div style={{ marginTop: 16, fontSize: 36, color: '#174f46' }}>{siteConfig.tagline}</div>
    </div>,
    size,
  );
}

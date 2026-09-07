import { cn } from '@/lib/utils';

const badgeSizes = { sm: 'size-7 rounded-lg', md: 'size-9 rounded-xl', lg: 'size-12 rounded-2xl' } as const;
const glyphSizes = { sm: 'size-4', md: 'size-5', lg: 'size-7' } as const;
const textSizes = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' } as const;

/** The CareLink glyph — a heart with a pulse line ("care" + "link"). Draws in
 *  currentColor so it inherits from whatever background it sits on. */
function Glyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
        fill="currentColor"
        fillOpacity="0.25"
      />
      <path
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 12h5l1.5-2.5 2.5 5 2-8 1.8 5.5H21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Just the badge — for tight spots (favicons, avatars, mobile headers). */
export function LogoMark({
  size = 'md',
  className,
}: {
  size?: keyof typeof badgeSizes;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-primary text-primary-foreground',
        badgeSizes[size],
        className,
      )}
    >
      <Glyph className={glyphSizes[size]} />
    </span>
  );
}

/** The full lockup: badge + "CareLink" wordmark. */
export function Logo({
  size = 'md',
  wordmark = true,
  className,
}: {
  size?: keyof typeof badgeSizes;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} />
      {wordmark && (
        <span className={cn('font-semibold tracking-tight text-foreground', textSizes[size])}>
          Care<span className="text-primary">Link</span>
        </span>
      )}
    </span>
  );
}

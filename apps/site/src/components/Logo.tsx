import Link from 'next/link';

export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="12" fill="#196356" />
      <path
        d="M20 30c0-7 3.5-12.5 10-15-.5 8-4 13.5-10 15Zm0 0c0-7-3.5-12.5-10-15 .5 8 4 13.5 10 15Z"
        fill="#d8f2e9"
      />
      <circle cx="20" cy="12" r="3" fill="#d8f2e9" />
    </svg>
  );
}

/** "Harivin" wordmark with the rest of the name beneath; the subline wraps on small screens. */
export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 rounded-md sm:gap-2.5">
      <LogoMark className="h-9 w-9 max-[359px]:hidden" />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-lg font-semibold text-brand-950 sm:text-xl">
          Harivin
        </span>
        <span className="text-xs tracking-wide text-muted max-sm:max-w-30">
          Multispecialty Homeo Clinic
        </span>
      </span>
    </Link>
  );
}

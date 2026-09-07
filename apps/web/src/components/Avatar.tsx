import { cn } from '@/lib/utils';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const sizes = {
  sm: 'size-7 text-[0.7rem]',
  md: 'size-9 text-sm',
  lg: 'size-14 text-lg',
} as const;

/** Round avatar: the user's image if present, otherwise their initials on a
 *  tinted disc. */
export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return src ? (
    <img
      src={src}
      alt={name}
      className={cn('shrink-0 rounded-full object-cover', sizes[size], className)}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary',
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

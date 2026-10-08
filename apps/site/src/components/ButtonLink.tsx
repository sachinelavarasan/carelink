import Link from 'next/link';
import type { ComponentProps } from 'react';

const variants = {
  primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800 focus-visible:outline-brand-800',
  secondary: 'border border-brand-700 bg-white text-brand-800 hover:bg-brand-50',
  light: 'bg-white text-brand-900 shadow-sm hover:bg-brand-50',
} as const;

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: keyof typeof variants;
};

export function ButtonLink({ variant = 'primary', className = '', ...props }: ButtonLinkProps) {
  return (
    <Link
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

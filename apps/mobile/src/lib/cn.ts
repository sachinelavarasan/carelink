/** Minimal class-name joiner (NativeWind resolves the merged string). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

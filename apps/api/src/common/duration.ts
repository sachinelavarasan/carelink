const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parses "15m" / "30d" / "45s" / "12h" into milliseconds. */
export function durationToMs(input: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(input.trim());
  if (!match) throw new Error(`invalid duration: ${input}`);
  return Number(match[1]) * UNIT_MS[match[2]];
}

export const durationToSeconds = (input: string): number => Math.floor(durationToMs(input) / 1000);

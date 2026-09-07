import { describe, expect, it } from 'vitest';
import { durationToMs, durationToSeconds } from './duration';

describe('durationToMs', () => {
  it('parses each unit', () => {
    expect(durationToMs('45s')).toBe(45_000);
    expect(durationToMs('15m')).toBe(900_000);
    expect(durationToMs('2h')).toBe(7_200_000);
    expect(durationToMs('30d')).toBe(2_592_000_000);
  });

  it('tolerates whitespace', () => {
    expect(durationToMs(' 10m ')).toBe(600_000);
  });

  it('rejects garbage', () => {
    expect(() => durationToMs('soon')).toThrow();
    expect(() => durationToMs('10')).toThrow();
    expect(() => durationToMs('10y')).toThrow();
  });

  it('durationToSeconds floors to whole seconds', () => {
    expect(durationToSeconds('15m')).toBe(900);
  });
});

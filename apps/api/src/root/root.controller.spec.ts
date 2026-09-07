import { describe, expect, it } from 'vitest';
import { RootController } from './root.controller';
import { formatUptime } from './status-page';
import type { Database } from '../db';

describe('formatUptime', () => {
  it('shows the largest two non-zero units', () => {
    expect(formatUptime(93_784)).toBe('1d 2h');
    expect(formatUptime(3_661)).toBe('1h 1m');
    expect(formatUptime(45)).toBe('45s');
  });

  it('falls back to 0s', () => {
    expect(formatUptime(0)).toBe('0s');
    expect(formatUptime(-10)).toBe('0s');
  });
});

describe('RootController', () => {
  it('renders an ok card when the db query succeeds', async () => {
    const db = { execute: async () => [{ '?column?': 1 }] } as unknown as Database;
    const html = await new RootController({ db } as unknown as Database).index();

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('CareLink API');
    expect(html).toContain('All systems operational');
    expect(html).toMatch(/Database<\/span><span class="v">up<\/span>/);
  });

  it('renders a degraded card when the db query throws', async () => {
    const db = {
      execute: async () => {
        throw new Error('no connection');
      },
    } as unknown as Database;
    const html = await new RootController({ db } as unknown as Database).index();

    expect(html).toContain('degraded dependencies');
    expect(html).toMatch(/Database<\/span><span class="v">down<\/span>/);
  });
});

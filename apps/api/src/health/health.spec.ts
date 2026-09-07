import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller';
import type { Database } from '../db';

describe('HealthController', () => {
  it('reports db up when the query succeeds', async () => {
    const fakeDb = { execute: async () => [{ '?column?': 1 }] } as unknown as Database;
    const controller = new HealthController(fakeDb);

    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('up');
  });

  it('reports db down when the query throws', async () => {
    const fakeDb = {
      execute: async () => {
        throw new Error('no connection');
      },
    } as unknown as Database;
    const controller = new HealthController(fakeDb);

    const result = await controller.check();

    expect(result.db).toBe('down');
  });
});

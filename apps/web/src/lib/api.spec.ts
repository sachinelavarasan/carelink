import { describe, expect, it } from 'vitest';
import { API_PREFIX } from '@carelink/shared';

describe('shared contract', () => {
  it('exposes the versioned api prefix', () => {
    expect(API_PREFIX).toBe('/api/v1');
  });
});

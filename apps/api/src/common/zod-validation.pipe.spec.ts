import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

const schema = z.object({ email: z.string().email(), age: z.coerce.number().int().min(0) });

describe('ZodValidationPipe', () => {
  it('returns parsed + coerced data on success', () => {
    const pipe = new ZodValidationPipe(schema);
    expect(pipe.transform({ email: 'a@b.com', age: '42' })).toEqual({ email: 'a@b.com', age: 42 });
  });

  it('throws BadRequestException with field paths on failure', () => {
    const pipe = new ZodValidationPipe(schema);
    try {
      pipe.transform({ email: 'nope', age: -1 });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const body = (err as BadRequestException).getResponse() as { errors: { path: string }[] };
      expect(body.errors.map((e) => e.path).sort()).toEqual(['age', 'email']);
    }
  });
});

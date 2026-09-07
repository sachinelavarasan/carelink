import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Express } from 'express';
import { createApp } from '../src/bootstrap';

let appPromise: Promise<Express> | undefined;

async function build(): Promise<Express> {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance() as Express;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    appPromise ??= build();
    const express = await appPromise;
    // Vercel invokes this with Node's native (req, res); an Express instance is
    // itself a `(req, res)` handler, so hand off directly. No serverless-http:
    // that wraps the app in an AWS Lambda `(event, context)` signature, which
    // never writes to Vercel's `res` — the function then hangs until it hits
    // maxDuration and returns FUNCTION_INVOCATION_TIMEOUT (504).
    express(req, res);
  } catch (err) {
    // Don't leave a rejected promise cached — let the next request rebuild.
    appPromise = undefined;
    console.error('API bootstrap failed', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}

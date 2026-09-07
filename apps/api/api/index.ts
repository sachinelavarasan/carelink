import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'node:http';
import serverlessHttp from 'serverless-http';
import type { Express } from 'express';
import { createApp } from '../src/bootstrap';

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

let handlerPromise: Promise<Handler> | undefined;

async function build(): Promise<Handler> {
  const app = await createApp();
  await app.init();
  const express = app.getHttpAdapter().getInstance() as Express;
  return serverlessHttp(express) as unknown as Handler;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  handlerPromise ??= build();
  const h = await handlerPromise;
  return h(req, res);
}

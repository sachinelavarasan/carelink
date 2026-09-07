import 'reflect-metadata';
import { createApp } from './bootstrap';

async function main(): Promise<void> {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 3000);
  // Bind 0.0.0.0 so container platforms (Render, Fly, etc.) can route to it.
  await app.listen(port, '0.0.0.0');
  console.log(`API listening on port ${port}`);
}

void main();

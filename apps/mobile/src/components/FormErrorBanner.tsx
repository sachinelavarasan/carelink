import { Notice } from './Notice';

/** Server-error banner for forms. Renders nothing when `message` is empty. */
export function FormErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return <Notice tone="danger">{message}</Notice>;
}

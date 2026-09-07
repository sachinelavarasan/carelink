import { useRef, useState } from 'react';
import type { AvatarResult } from '@carelink/shared';
import { api, errMessage, isStatus } from '../lib/api';
import { Avatar } from './Avatar';
import { Notice } from './Notice';
import { Button } from './ui/button';

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

/** Profile-picture control: shows the current avatar with pick / remove actions.
 *  Uploads a multipart `file` to PUT /me/avatar and calls `onChanged` to refresh. */
export function AvatarUpload({
  name,
  src,
  onChanged,
}: {
  name: string;
  src?: string | null;
  onChanged: () => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    if (!ACCEPT.includes(file.type)) {
      setError('Choose a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be 2 MB or smaller.');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    try {
      await api.put<AvatarResult>('/me/avatar', form);
      await onChanged();
    } catch (err) {
      setError(
        isStatus(err, 501)
          ? 'Photo uploads aren’t available yet — image storage isn’t configured.'
          : errMessage(err, 'Could not upload that image'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      await api.delete<AvatarResult>('/me/avatar');
      await onChanged();
    } catch (err) {
      setError(errMessage(err, 'Could not remove your photo'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} src={src} size="lg" />
      <div className="grid gap-1.5">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Working…' : src ? 'Change photo' : 'Add photo'}
          </Button>
          {src && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={remove}>
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPEG, PNG or WebP · up to 2 MB</p>
        {error && <Notice kind="error">{error}</Notice>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void upload(file);
        }}
      />
    </div>
  );
}

import type { MessagesPage, ThreadView } from '@carelink/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Notice } from '../components/Notice';
import { Spinner } from '../components/Spinner';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { cn } from '../lib/utils';
import { api, apiGet, errMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDateTime, fmtTime } from '../lib/format';

export default function Consult() {
  const { appointmentId = '' } = useParams();
  const { me } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [sendErr, setSendErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const threadQ = useQuery({
    queryKey: ['thread', appointmentId],
    queryFn: () => apiGet<ThreadView>(`/appointments/${appointmentId}/thread`),
    refetchInterval: 15_000, // catch PENDING → OPEN → CLOSED transitions
  });
  const thread = threadQ.data;

  const messagesQ = useQuery({
    queryKey: ['messages', thread?.id],
    queryFn: () => apiGet<MessagesPage>(`/threads/${thread!.id}/messages`),
    enabled: Boolean(thread?.id),
    refetchInterval: thread?.state === 'OPEN' ? 4_000 : false,
  });
  const messages = messagesQ.data?.items ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const sendM = useMutation({
    mutationFn: (body: string) => api.post('/messages', { threadId: thread!.id, body }),
    onSuccess: () => {
      setDraft('');
      setSendErr(null);
      void qc.invalidateQueries({ queryKey: ['messages', thread?.id] });
    },
    onError: (e) => setSendErr(errMessage(e, 'Could not send')),
  });

  const verifyM = useMutation({
    mutationFn: () => api.post(`/appointments/${appointmentId}/verify-identity`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['thread', appointmentId] }),
  });

  function onSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || thread?.state !== 'OPEN' || sendM.isPending) return;
    sendM.mutate(body);
  }

  if (threadQ.isLoading) {
    return (
      <AppShell>
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading…
        </p>
      </AppShell>
    );
  }
  if (threadQ.isError || !thread) {
    return (
      <AppShell>
        <Notice kind="error">{errMessage(threadQ.error, 'Consultation not found')}</Notice>
        <Link className="text-primary underline underline-offset-4" to="/appointments">
          ← Appointments
        </Link>
      </AppShell>
    );
  }

  const isDoctor = thread.viewerRole === 'DOCTOR';

  return (
    <AppShell>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">Consultation with {thread.counterpartyName}</h1>
        <Link className="text-sm text-primary underline underline-offset-4" to="/appointments">
          ← Back
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">{thread.reasonForVisit}</p>

      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        <Link
          className="text-primary underline underline-offset-4"
          to={`/consult/${appointmentId}/video`}
        >
          Video call
        </Link>
        <Link
          className="text-primary underline underline-offset-4"
          to={`/appointments/${appointmentId}/prescription`}
        >
          {isDoctor ? 'Prescription' : 'View prescription'}
        </Link>
        {isDoctor && (
          <Link
            className="text-primary underline underline-offset-4"
            to={`/patients/${thread.counterpartyId}/history`}
          >
            Patient history
          </Link>
        )}
      </div>

      {thread.state === 'PENDING' && (
        <div className="mt-3">
          <Notice kind="warning">This consultation opens at {fmtDateTime(thread.opensAt)}.</Notice>
        </div>
      )}
      {thread.state === 'CLOSED' && (
        <div className="mt-3">
          <Notice kind="warning">
            This consultation closed on {fmtDateTime(thread.closesAt)}. It is read-only.
          </Notice>
        </div>
      )}

      {isDoctor && (
        <div className="my-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 text-sm">
          <span className={thread.consentAcceptedAt ? 'text-success-fg' : 'text-muted-foreground'}>
            {thread.consentAcceptedAt ? '✓ Teleconsent recorded' : 'No teleconsent on file'}
          </span>
          <span className="text-border">·</span>
          {thread.identityVerifiedAt ? (
            <span className="text-success-fg">✓ Identity verified</span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={verifyM.isPending}
              onClick={() => verifyM.mutate()}
            >
              {verifyM.isPending ? 'Verifying…' : 'Verify patient identity'}
            </Button>
          )}
        </div>
      )}
      {!isDoctor && thread.identityVerifiedAt && (
        <p className="my-2 text-sm text-success-fg">✓ Your identity was verified by the doctor.</p>
      )}

      <div className="mt-4 flex max-h-[55vh] min-h-40 flex-col gap-2 overflow-y-auto rounded-lg border border-border bg-card p-3">
        {messagesQ.isLoading && <Spinner />}
        {messages.length === 0 && !messagesQ.isLoading && (
          <p className="m-auto text-sm text-muted-foreground">No messages yet.</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === me?.user.id;
          return (
            <div
              key={m.id}
              className={cn('flex flex-col', mine ? 'items-end self-end' : 'items-start self-start')}
            >
              <div
                className={cn(
                  'max-w-[75vw] rounded-lg px-3 py-2 text-sm sm:max-w-md',
                  mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                )}
              >
                {m.body}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {fmtTime(m.sentAt)}
                {mine && m.readAt ? ' · Read' : ''}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {sendErr && (
        <div className="mt-2">
          <Notice kind="error">{sendErr}</Notice>
        </div>
      )}
      <form onSubmit={onSend} className="mt-3 flex items-end gap-2">
        <Textarea
          className="flex-1"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={thread.state === 'OPEN' ? 'Write a message…' : 'The consultation is not open'}
          disabled={thread.state !== 'OPEN' || sendM.isPending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend(e as unknown as FormEvent);
            }
          }}
        />
        <Button
          type="submit"
          disabled={thread.state !== 'OPEN' || sendM.isPending || !draft.trim()}
        >
          {sendM.isPending ? 'Sending…' : 'Send'}
        </Button>
      </form>
    </AppShell>
  );
}

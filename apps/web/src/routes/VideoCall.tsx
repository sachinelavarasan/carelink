import type { VideoSession } from '@carelink/shared';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Notice } from '../components/Notice';
import { Spinner } from '../components/Spinner';
import { api, apiGet, errMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/format';

// Clinical call — no recording or streaming is offered. Explicit allow-list of
// toolbar buttons (drops `recording`, `livestreaming`, `sharedvideo`, …) plus
// the config flags that disable the features outright.
const TOOLBAR_BUTTONS = [
  'camera',
  'microphone',
  'desktop',
  'toggle-camera',
  'tileview',
  'select-background',
  'noisesuppression',
  'raisehand',
  'participants-pane',
  'chat',
  'settings',
  'fullscreen',
  'hangup',
];

const JITSI_CONFIG = {
  prejoinPageEnabled: true,
  disableThirdPartyRequests: true,
  toolbarButtons: TOOLBAR_BUTTONS,
  fileRecordingsEnabled: false,
  liveStreamingEnabled: false,
  transcribingEnabled: false,
  localRecording: { disable: true, disableSelfRecording: true },
  hiddenPremeetingButtons: ['recording', 'livestreaming'],
};

const JITSI_INTERFACE_CONFIG = {
  MOBILE_APP_PROMO: false,
  TOOLBAR_BUTTONS, // older self-hosted deployments read this key
};

export default function VideoCall() {
  const { appointmentId = '' } = useParams();
  const { me } = useAuth();
  const navigate = useNavigate();

  const sessionQ = useQuery({
    queryKey: ['video', appointmentId],
    queryFn: () => apiGet<VideoSession>(`/appointments/${appointmentId}/video`),
    refetchInterval: (q) => (q.state.data?.canJoin ? false : 20_000),
  });
  const session = sessionQ.data;

  const startM = useMutation({
    mutationFn: () => api.post(`/appointments/${appointmentId}/video/start`, {}),
  });
  const endM = useMutation({
    mutationFn: () => api.post(`/appointments/${appointmentId}/video/end`, {}),
  });

  const leave = useCallback(() => {
    endM.mutate(undefined, { onSettled: () => navigate(`/consult/${appointmentId}`) });
  }, [appointmentId, endM, navigate]);

  const back = (
    <Link className="text-sm text-primary underline underline-offset-4" to={`/consult/${appointmentId}`}>
      ← Consultation
    </Link>
  );

  if (sessionQ.isLoading) {
    return (
      <AppShell>
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading…
        </p>
      </AppShell>
    );
  }

  if (sessionQ.isError || !session) {
    return (
      <AppShell>
        <Notice kind="error">{errMessage(sessionQ.error, 'Video call not available')}</Notice>
        <div className="mt-2">{back}</div>
      </AppShell>
    );
  }

  if (!session.canJoin) {
    const msg =
      session.state === 'ENDED'
        ? 'This video consultation has ended.'
        : `The video call opens at ${fmtDateTime(session.windowOpensAt)}.`;
    return (
      <AppShell>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-semibold">Video consultation</h1>
          {back}
        </div>
        <Notice kind="warning">{msg}</Notice>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">Video consultation</h1>
        {back}
      </div>
      <div className="overflow-hidden rounded-lg border border-border" style={{ height: '70vh' }}>
        <JitsiMeeting
          domain={session.domain}
          roomName={session.roomName}
          userInfo={{ displayName: me?.user.fullName ?? 'Participant', email: '' }}
          configOverwrite={JITSI_CONFIG}
          interfaceConfigOverwrite={JITSI_INTERFACE_CONFIG}
          getIFrameRef={(node) => {
            node.style.height = '100%';
            node.style.width = '100%';
          }}
          onApiReady={(externalApi) => {
            externalApi.addEventListener('videoConferenceJoined', () => startM.mutate());
            externalApi.addEventListener('readyToClose', leave);
          }}
        />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Text chat and the prescription stay available on the{' '}
        <Link className="text-primary underline underline-offset-4" to={`/consult/${appointmentId}`}>
          consultation page
        </Link>
        .
      </p>
    </AppShell>
  );
}

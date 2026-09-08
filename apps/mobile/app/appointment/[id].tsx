import { Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IntakePanel } from '@/components/IntakePanel';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { showToast } from '@/components/ToastMessage';
import { useConfirm } from '@/hooks/useConfirm';
import {
  useAppointment,
  useCancelAppointment,
  useVerifyIdentity,
} from '@/hooks/useAppointments';
import { useAppointmentPrescription } from '@/hooks/usePrescriptions';
import { errMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

export default function AppointmentDetail() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const { color } = useTheme();
  const { me } = useAuth();
  const confirm = useConfirm();

  const { data: a, isLoading, isError, error } = useAppointment(id);
  const rx = useAppointmentPrescription(id);
  const isDoctor = me?.user.role === 'DOCTOR';

  const cancel = useCancelAppointment(id);
  const verify = useVerifyIdentity(id);

  const line = { fontSize: 13, color: color['muted-foreground'] } as const;
  const label = { fontSize: 12, fontWeight: '600' as const, color: color['muted-foreground'] };

  const isUpcoming = a ? new Date(a.scheduledEnd).getTime() > Date.now() : false;
  const canAct = a?.status === 'CONFIRMED' && isUpcoming;

  async function onCancel() {
    const reason = await confirm({
      title: 'Cancel appointment?',
      message: 'The other party is notified.',
      withInput: true,
      inputPlaceholder: 'Reason (min 3 characters)',
      inputMinLength: 3,
      confirmLabel: 'Cancel appointment',
      cancelLabel: 'Keep',
      destructive: true,
    });
    if (reason === false) return;
    try {
      await cancel.mutateAsync({ reason });
      showToast({ type: 'success', text1: 'Appointment cancelled' });
    } catch (err) {
      showToast({ type: 'error', text1: errMessage(err, 'Could not cancel') });
    }
  }

  async function onVerify() {
    try {
      await verify.mutateAsync();
      showToast({ type: 'success', text1: 'Identity verified' });
    } catch (err) {
      showToast({ type: 'error', text1: errMessage(err, 'Could not update') });
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Appointment', headerBackTitle: 'Back' }} />
      <Screen contentStyle={{ gap: 12 }}>
        {isLoading ? <Text style={line}>Loading…</Text> : null}
        {isError ? <Notice tone="danger">{errMessage(error, 'Not found')}</Notice> : null}

        {a ? (
          <>
            <Card style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: color.foreground }}>
                  {fmtDateTime(a.scheduledStart)}
                </Text>
                <StatusBadge status={a.status} />
              </View>
              {name ? <Text style={line}>with {name}</Text> : null}
              <Text style={line}>{a.reasonForVisit}</Text>

              <View style={{ marginTop: 6, gap: 4 }}>
                <Text style={label}>
                  Consent{'  '}
                  <Text style={{ fontWeight: '400', color: color.foreground }}>
                    {a.consentAcceptedAt ? `accepted ${fmtDate(a.consentAcceptedAt)}` : 'not recorded'}
                  </Text>
                </Text>
                <Text style={label}>
                  Identity{'  '}
                  <Text style={{ fontWeight: '400', color: color.foreground }}>
                    {a.identityVerifiedAt ? `verified ${fmtDate(a.identityVerifiedAt)}` : 'not verified'}
                  </Text>
                </Text>
              </View>

              {a.status === 'CANCELLED' && a.cancelReason ? (
                <Notice tone="danger">Cancelled — {a.cancelReason}</Notice>
              ) : null}
            </Card>

            {/* doctor: patient's pre-consultation intake */}
            {isDoctor ? <IntakePanel appointmentId={id} /> : null}

            {/* actions */}
            <View style={{ gap: 8 }}>
              {isDoctor && canAct && !a.identityVerifiedAt ? (
                <Button label="Verify patient identity" busy={verify.isPending} onPress={onVerify} />
              ) : null}

              {isDoctor && (a.status === 'CONFIRMED' || a.status === 'COMPLETED') ? (
                <Button
                  label={rx.data ? 'Edit prescription' : 'Write prescription'}
                  variant={a.status === 'COMPLETED' ? 'outline' : 'primary'}
                  onPress={() => router.push(`/appointment/${id}/prescription`)}
                />
              ) : null}

              {!isDoctor && canAct ? (
                <>
                  <Button
                    label="Pre-visit form"
                    variant="outline"
                    onPress={() => router.push(`/appointment/${id}/intake`)}
                  />
                  <Button
                    label="Reschedule"
                    variant="outline"
                    onPress={() => router.push(`/book?reschedule=${id}`)}
                  />
                  <Button
                    label="Cancel appointment"
                    variant="destructive"
                    busy={cancel.isPending}
                    onPress={onCancel}
                  />
                </>
              ) : null}

              {rx.data?.status === 'FINALIZED' ? (
                <Button
                  label="View prescription"
                  variant="outline"
                  onPress={() => router.push(`/prescription/${rx.data!.id}`)}
                />
              ) : null}
            </View>
          </>
        ) : null}
      </Screen>
    </>
  );
}

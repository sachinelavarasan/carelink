import type { AppointmentIntakeInput } from '@carelink/shared';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { RowSelect } from '@/components/RowSelect';
import { showToast } from '@/components/ToastMessage';
import { useAppointment } from '@/hooks/useAppointments';
import { useIntake, useSaveIntake } from '@/hooks/useIntake';
import { errMessage } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';

const SEVERITY = [
  { label: 'Not sure', value: '' as const },
  { label: 'Mild', value: 'MILD' as const },
  { label: 'Moderate', value: 'MODERATE' as const },
  { label: 'Severe', value: 'SEVERE' as const },
];

type FormShape = {
  chiefComplaint: string;
  symptomsStarted: string;
  severity: '' | 'MILD' | 'MODERATE' | 'SEVERE';
  currentMedications: string;
  allergies: string;
  additionalNotes: string;
};

const blank = (s?: string) => s?.trim() || undefined;

export default function Intake() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { color } = useTheme();

  const appt = useAppointment(id);
  const intake = useIntake(id);
  const save = useSaveIntake(id);

  const locked = appt.data?.status === 'COMPLETED' || appt.data?.status === 'CANCELLED';

  const { control, handleSubmit, formState } = useForm<FormShape>({
    values: {
      chiefComplaint: intake.data?.chiefComplaint ?? '',
      symptomsStarted: intake.data?.symptomsStarted ?? '',
      severity: intake.data?.severity ?? '',
      currentMedications: intake.data?.currentMedications ?? '',
      allergies: intake.data?.allergies ?? '',
      additionalNotes: intake.data?.additionalNotes ?? '',
    },
  });

  const onSubmit = async (v: FormShape) => {
    const payload: AppointmentIntakeInput = {
      chiefComplaint: v.chiefComplaint.trim(),
      symptomsStarted: blank(v.symptomsStarted),
      severity: v.severity || undefined,
      currentMedications: blank(v.currentMedications),
      allergies: blank(v.allergies),
      additionalNotes: blank(v.additionalNotes),
    };
    try {
      await save.mutateAsync(payload);
      showToast({ type: 'success', text1: 'Pre-visit form saved' });
      router.back();
    } catch (err) {
      showToast({ type: 'error', text1: errMessage(err, 'Could not save') });
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Pre-visit form" />
      <Screen contentStyle={{ gap: 14 }}>
        <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>
          Share this with your doctor before the consultation. You can edit it any time until the
          visit.
        </Text>

        {locked ? <Notice tone="info">This consultation is closed — the form is read-only.</Notice> : null}

        <Controller
          control={control}
          name="chiefComplaint"
          rules={{
            validate: (v) => v.trim().length >= 3 || 'Please describe your main concern (3+ characters)',
          }}
          render={({ field }) => (
            <Field
              label="Main concern *"
              placeholder="What's the consultation about?"
              multiline
              editable={!locked}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={formState.errors.chiefComplaint?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="symptomsStarted"
          render={({ field }) => (
            <Field
              label="When did it start?"
              placeholder="e.g. 3 days ago"
              editable={!locked}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <Controller
          control={control}
          name="severity"
          render={({ field }) => (
            <RowSelect
              label="Severity"
              sheetTitle="Severity"
              options={SEVERITY}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="currentMedications"
          render={({ field }) => (
            <Field
              label="Current medications"
              placeholder="Anything you're taking now"
              multiline
              editable={!locked}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <Controller
          control={control}
          name="allergies"
          render={({ field }) => (
            <Field
              label="Allergies"
              placeholder="Drug or other allergies"
              multiline
              editable={!locked}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <Controller
          control={control}
          name="additionalNotes"
          render={({ field }) => (
            <Field
              label="Anything else"
              placeholder="Other context for the doctor"
              multiline
              editable={!locked}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />

        {!locked ? (
          <Button label="Save" busy={save.isPending} onPress={handleSubmit(onSubmit)} />
        ) : null}
      </Screen>
    </>
  );
}

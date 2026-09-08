import type { PatientProfileInput } from '@carelink/shared';
import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { RowDatePicker } from '@/components/RowDatePicker';
import { Field } from '@/components/Field';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { RowSelect } from '@/components/RowSelect';
import { showToast } from '@/components/ToastMessage';
import { useUpsertPatientProfile } from '@/hooks/useProfile';
import { errMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const GENDERS = [
  { label: 'Male', value: 'MALE' as const },
  { label: 'Female', value: 'FEMALE' as const },
  { label: 'Other', value: 'OTHER' as const },
];

const parseList = (s: string) => s.split(',').map((v) => v.trim()).filter(Boolean);
const num = (s: string) => (s.trim() === '' ? undefined : Number(s));

export default function EditPatientProfile() {
  const router = useRouter();
  const { me } = useAuth();
  const p = me?.patientProfile;
  const save = useUpsertPatientProfile();
  const [error, setError] = useState<string | null>(null);

  const [f, setF] = useState({
    dob: p?.dob ?? '',
    gender: (p?.gender ?? 'MALE') as 'MALE' | 'FEMALE' | 'OTHER',
    bloodGroup: p?.bloodGroup ?? '',
    heightCm: p?.heightCm?.toString() ?? '',
    weightKg: p?.weightKg?.toString() ?? '',
    address: p?.address ?? '',
    emergencyContactName: p?.emergencyContactName ?? '',
    emergencyContactPhone: p?.emergencyContactPhone ?? '',
    allergies: (p?.allergies ?? []).join(', '),
    chronicConditions: (p?.chronicConditions ?? []).join(', '),
  });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function onSave() {
    if (!f.dob) {
      setError('Enter your date of birth.');
      return;
    }
    const payload: PatientProfileInput = {
      dob: f.dob,
      gender: f.gender,
      bloodGroup: f.bloodGroup || undefined,
      heightCm: num(f.heightCm),
      weightKg: num(f.weightKg),
      address: f.address || undefined,
      emergencyContactName: f.emergencyContactName || undefined,
      emergencyContactPhone: f.emergencyContactPhone || undefined,
      allergies: parseList(f.allergies),
      chronicConditions: parseList(f.chronicConditions),
    };
    try {
      await save.mutateAsync(payload);
      showToast({ type: 'success', text1: 'Profile saved' });
      router.back();
    } catch (err) {
      setError(errMessage(err, 'Could not save'));
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Patient profile', headerBackTitle: 'Back' }} />
      <Screen contentStyle={{ gap: 14 }}>
        {error ? <Notice tone="danger">{error}</Notice> : null}

        <RowDatePicker
          label="Date of birth"
          value={f.dob}
          onChange={set('dob')}
          maximumDate={new Date()}
        />
        <RowSelect label="Gender" options={GENDERS} value={f.gender} onChange={set('gender')} />
        <Field label="Blood group" placeholder="O+" value={f.bloodGroup} onChangeText={set('bloodGroup')} />
        <Field label="Height (cm)" keyboardType="decimal-pad" value={f.heightCm} onChangeText={set('heightCm')} />
        <Field label="Weight (kg)" keyboardType="decimal-pad" value={f.weightKg} onChangeText={set('weightKg')} />
        <Field label="Address" multiline value={f.address} onChangeText={set('address')} />
        <Field
          label="Emergency contact name"
          value={f.emergencyContactName}
          onChangeText={set('emergencyContactName')}
        />
        <Field
          label="Emergency contact phone"
          keyboardType="phone-pad"
          value={f.emergencyContactPhone}
          onChangeText={set('emergencyContactPhone')}
        />
        <Field
          label="Allergies (comma-separated)"
          value={f.allergies}
          onChangeText={set('allergies')}
        />
        <Field
          label="Chronic conditions (comma-separated)"
          value={f.chronicConditions}
          onChangeText={set('chronicConditions')}
        />
        <Button label="Save profile" busy={save.isPending} onPress={onSave} />
      </Screen>
    </>
  );
}

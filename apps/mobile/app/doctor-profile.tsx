import type { DoctorProfileInput } from '@carelink/shared';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import {
  MedicineRowsEditor,
  fromMedicineItem,
  toMedicineItems,
  type MedicineDraft,
} from '@/components/MedicineRowsEditor';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { showToast } from '@/components/ToastMessage';
import { useUpsertDoctorProfile } from '@/hooks/useProfile';
import { errMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/ThemeProvider';

const parseList = (s: string) => s.split(',').map((v) => v.trim()).filter(Boolean);

export default function EditDoctorProfile() {
  const router = useRouter();
  const { color } = useTheme();
  const { me } = useAuth();
  const d = me?.doctorProfile;
  const save = useUpsertDoctorProfile();
  const [error, setError] = useState<string | null>(null);

  const [f, setF] = useState({
    medicalCouncil: d?.medicalCouncil ?? '',
    registrationNumber: d?.registrationNumber ?? '',
    specializations: (d?.specializations ?? []).join(', '),
    qualifications: d?.qualifications ?? '',
    yearsExperience: d?.yearsExperience?.toString() ?? '0',
    consultationFeeInr: d?.consultationFeeInr?.toString() ?? '0',
    clinicName: d?.clinicName ?? '',
    clinicAddress: d?.clinicAddress ?? '',
    clinicMapUrl: d?.clinicMapUrl ?? '',
    clinicPhone: d?.clinicPhone ?? '',
    bio: d?.bio ?? '',
  });
  const [meds, setMeds] = useState<MedicineDraft[]>(
    (d?.favoriteMedicines ?? []).map(fromMedicineItem),
  );
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function onSave() {
    if (!f.medicalCouncil.trim() || !f.registrationNumber.trim() || !f.qualifications.trim()) {
      setError('Council, registration number and qualifications are required.');
      return;
    }
    if (parseList(f.specializations).length === 0) {
      setError('Add at least one specialization.');
      return;
    }
    const payload: DoctorProfileInput = {
      medicalCouncil: f.medicalCouncil.trim(),
      registrationNumber: f.registrationNumber.trim(),
      specializations: parseList(f.specializations),
      qualifications: f.qualifications.trim(),
      yearsExperience: Number(f.yearsExperience) || 0,
      consultationFeeInr: Number(f.consultationFeeInr) || 0,
      clinicName: f.clinicName || undefined,
      clinicAddress: f.clinicAddress || undefined,
      clinicMapUrl: f.clinicMapUrl || undefined,
      clinicPhone: f.clinicPhone || undefined,
      bio: f.bio || undefined,
      favoriteMedicines: toMedicineItems(meds),
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
      <Stack.Screen options={{ headerShown: true, title: 'Doctor profile', headerBackTitle: 'Back' }} />
      <Screen contentStyle={{ gap: 14 }}>
        {error ? <Notice tone="danger">{error}</Notice> : null}

        <Field label="Medical council *" value={f.medicalCouncil} onChangeText={set('medicalCouncil')} />
        <Field
          label="Registration number *"
          value={f.registrationNumber}
          onChangeText={set('registrationNumber')}
        />
        <Field
          label="Specializations (comma-separated) *"
          value={f.specializations}
          onChangeText={set('specializations')}
        />
        <Field label="Qualifications *" value={f.qualifications} onChangeText={set('qualifications')} />
        <Field
          label="Years of experience"
          keyboardType="number-pad"
          value={f.yearsExperience}
          onChangeText={set('yearsExperience')}
        />
        <Field
          label="Consultation fee (₹)"
          keyboardType="number-pad"
          value={f.consultationFeeInr}
          onChangeText={set('consultationFeeInr')}
        />
        <Field label="Clinic name" value={f.clinicName} onChangeText={set('clinicName')} />
        <Field label="Clinic address" multiline value={f.clinicAddress} onChangeText={set('clinicAddress')} />
        <Field
          label="Map link"
          keyboardType="url"
          autoCapitalize="none"
          placeholder="https://maps.google.com/?q=…"
          value={f.clinicMapUrl}
          onChangeText={set('clinicMapUrl')}
        />
        <Field label="Clinic phone" keyboardType="phone-pad" value={f.clinicPhone} onChangeText={set('clinicPhone')} />
        <Field label="Short bio" multiline value={f.bio} onChangeText={set('bio')} />

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: color.foreground }}>
            Regular medicines
          </Text>
          <Text style={{ fontSize: 12, color: color['muted-foreground'] }}>
            Save medicines you prescribe often — drop them into a prescription in one tap.
          </Text>
        </View>
        <MedicineRowsEditor rows={meds} onChange={setMeds} />

        <Button label="Save profile" busy={save.isPending} onPress={onSave} />
      </Screen>
    </>
  );
}

import type { DoctorProfileInput } from '@carelink/shared';
import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import {
  MedicineRowsEditor,
  fromMedicineItem,
  toMedicineItems,
  type MedicineDraft,
} from '@/components/MedicineRowsEditor';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { showToast } from '@/components/ToastMessage';
import { useUpsertDoctorProfile } from '@/hooks/useProfile';
import { errMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/**
 * The doctor's list of frequently-prescribed medicines. Stored on the doctor
 * profile (`favoriteMedicines`), but managed here on its own so it isn't buried
 * in the profile editor. Shown as a pick-list on the prescription drug-name field.
 */
export default function FrequentMedicines() {
  const router = useRouter();
  const { me } = useAuth();
  const d = me?.doctorProfile;
  const save = useUpsertDoctorProfile();

  const [error, setError] = useState<string | null>(null);
  const [meds, setMeds] = useState<MedicineDraft[]>(
    (d?.favoriteMedicines ?? []).map(fromMedicineItem),
  );

  async function onSave() {
    if (!d) return;
    // The upsert replaces the whole profile — carry every field through so a
    // medicines edit never clears the registration / clinic details.
    const payload: DoctorProfileInput = {
      medicalCouncil: d.medicalCouncil,
      registrationNumber: d.registrationNumber,
      specializations: d.specializations,
      qualifications: d.qualifications,
      yearsExperience: d.yearsExperience,
      consultationFeeInr: d.consultationFeeInr,
      clinicName: d.clinicName ?? undefined,
      clinicAddress: d.clinicAddress ?? undefined,
      clinicMapUrl: d.clinicMapUrl ?? undefined,
      clinicPhone: d.clinicPhone ?? undefined,
      bio: d.bio ?? undefined,
      favoriteMedicines: toMedicineItems(meds),
    };
    try {
      await save.mutateAsync(payload);
      showToast({ type: 'success', text1: 'Medicines saved' });
      router.back();
    } catch (err) {
      setError(errMessage(err, 'Could not save'));
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Frequent medicines" />
      <Screen contentStyle={{ gap: 14 }}>
        {error ? <Notice tone="danger">{error}</Notice> : null}

        {!d ? (
          <EmptyState
            icon="medkit-outline"
            title="Complete your profile first"
            subtitle="Add your registration details before saving frequent medicines."
          >
            <Button label="Edit doctor profile" onPress={() => router.replace('/doctor-profile')} />
          </EmptyState>
        ) : (
          <>
            <Notice tone="info">
              Medicines saved here show up as a pick-list on the drug-name field while you write a
              prescription.
            </Notice>
            <MedicineRowsEditor rows={meds} onChange={setMeds} />
            <Button
              label="Save"
              busy={save.isPending}
              onPress={onSave}
              style={{ marginTop: 4 }}
            />
          </>
        )}
      </Screen>
    </>
  );
}

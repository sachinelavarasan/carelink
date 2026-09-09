import { drugCategoryFlagMeta } from '@carelink/theme';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { medicineLabel } from '@/components/MedicineRowsEditor';
import { showToast } from '@/components/ToastMessage';
import { usePrescription } from '@/hooks/usePrescriptions';
import { errMessage } from '@/lib/api';
import { mono } from '@/lib/fonts';
import { sharePrescriptionPdf } from '@/lib/pdf';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

export default function PrescriptionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { color } = useTheme();
  const { data: rx, isLoading, isError, error } = usePrescription(id);
  const [sharing, setSharing] = useState(false);

  const line = { fontSize: 13, color: color['muted-foreground'] } as const;
  const sectionLabel = {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    color: color['muted-foreground'],
  };

  async function share() {
    setSharing(true);
    try {
      await sharePrescriptionPdf(id);
    } catch (err) {
      showToast({ type: 'error', text1: errMessage(err, 'Could not open the PDF') });
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Prescription" />
      <Screen contentStyle={{ gap: 12 }}>
        {isLoading ? <Text style={line}>Loading…</Text> : null}
        {isError ? <Notice tone="danger">{errMessage(error, 'Not found')}</Notice> : null}

        {rx ? (
          <>
            <Card elevated style={{ gap: 4 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: color.foreground }}>
                {rx.diagnosis}
              </Text>
              <Text style={line}>
                {rx.patientName} · <Text style={mono('400')}>{fmtDateTime(rx.scheduledStart)}</Text>
              </Text>
              <Text style={line}>
                {rx.status === 'FINALIZED' && rx.finalizedAt
                  ? `Issued ${fmtDate(rx.finalizedAt)}`
                  : 'Draft'}
              </Text>
              {rx.drugCategoryFlags.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {rx.drugCategoryFlags.map((f) => (
                    <View
                      key={f}
                      style={{
                        borderRadius: 999,
                        backgroundColor: color.muted,
                        paddingHorizontal: 9,
                        paddingVertical: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10.5,
                          fontWeight: '700',
                          letterSpacing: 0.5,
                          textTransform: 'uppercase',
                          color: color['muted-foreground'],
                        }}
                      >
                        {drugCategoryFlagMeta[f].label}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>

            {rx.symptoms ? (
              <View style={{ gap: 2 }}>
                <Text style={sectionLabel}>Symptoms</Text>
                <Text style={{ fontSize: 14, color: color.foreground }}>{rx.symptoms}</Text>
              </View>
            ) : null}

            <View style={{ gap: 6 }}>
              <Text style={sectionLabel}>Medicines</Text>
              {rx.items.map((m) => (
                <Card key={m.id} style={{ gap: 2 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: color.foreground }}>
                    {medicineLabel(m)}
                  </Text>
                  <Text style={[line, mono('400')]}>
                    {m.frequency} · {m.durationDays} day{m.durationDays === 1 ? '' : 's'}
                  </Text>
                  {m.instructions ? <Text style={line}>{m.instructions}</Text> : null}
                </Card>
              ))}
            </View>

            {rx.advice ? (
              <View style={{ gap: 2 }}>
                <Text style={sectionLabel}>Advice</Text>
                <Text style={{ fontSize: 14, color: color.foreground }}>{rx.advice}</Text>
              </View>
            ) : null}

            {rx.notes ? (
              <View style={{ gap: 2 }}>
                <Text style={sectionLabel}>Clinical notes</Text>
                <Text style={{ fontSize: 14, color: color.foreground }}>{rx.notes}</Text>
              </View>
            ) : null}

            {rx.followUpDate ? (
              <Text style={line}>Follow-up suggested around {fmtDate(rx.followUpDate)}</Text>
            ) : null}

            <View
              style={{ gap: 2, borderTopWidth: 1, borderTopColor: color.border, paddingTop: 10, marginTop: 4 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: color.foreground }}>
                {rx.doctorName}
              </Text>
              <Text style={line}>{rx.doctorQualifications}</Text>
              <Text style={line}>
                {rx.medicalCouncil} · Reg. {rx.registrationNumber}
              </Text>
            </View>

            {rx.status === 'FINALIZED' ? (
              rx.pdfReady ? (
                <Button label="Share PDF" busy={sharing} onPress={share} />
              ) : (
                <Notice tone="info">The PDF is still being prepared — check back shortly.</Notice>
              )
            ) : null}
          </>
        ) : null}
      </Screen>
    </>
  );
}

import type { MedicalHistoryEntry } from '@carelink/shared';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { medicineLabel } from '@/components/MedicineRowsEditor';
import { StatusBadge } from '@/components/StatusBadge';
import { mono } from '@/lib/fonts';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

/** One past consultation. `who` picks which name to show (doctor sees the
 *  patient's name, patient sees the doctor's). */
export function HistoryEntryCard({
  entry,
  who,
}: {
  entry: MedicalHistoryEntry;
  who: 'doctor' | 'patient';
}) {
  const { color } = useTheme();
  const router = useRouter();
  const rx = entry.prescription;

  return (
    <Card style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={[mono('500'), { fontSize: 12.5, color: color.foreground, flex: 1 }]}>
          {fmtDateTime(entry.scheduledStart)}
        </Text>
        <StatusBadge status={entry.status} />
      </View>
      <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>
        {who === 'doctor' ? entry.patientName : entry.doctorName}
        {entry.reasonForVisit ? ` — ${entry.reasonForVisit}` : ''}
      </Text>
      {rx ? (
        <>
          <Text style={{ fontSize: 13, color: color.foreground }}>
            <Text style={{ fontWeight: '700' }}>Dx: </Text>
            {rx.diagnosis}
          </Text>

          {rx.items.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {rx.items.slice(0, 4).map((m) => (
                <View
                  key={m.id}
                  style={{
                    borderRadius: radius.pill,
                    backgroundColor: color.muted,
                    paddingHorizontal: 9,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={[mono('400'), { fontSize: 11, color: color['muted-foreground'] }]}>
                    {medicineLabel(m)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <Button
              label="View prescription"
              variant="outline"
              size="sm"
              style={{ alignSelf: 'flex-start' }}
              onPress={() => router.push(`/prescription/${rx.id}`)}
            />
            {rx.followUpDate ? (
              <Text style={[mono('400'), { fontSize: 11, color: color['muted-foreground'] }]}>
                Follow-up {fmtDate(rx.followUpDate)}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}
    </Card>
  );
}

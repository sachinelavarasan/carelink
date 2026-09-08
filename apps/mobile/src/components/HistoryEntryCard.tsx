import type { MedicalHistoryEntry } from '@carelink/shared';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { fmtDateTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

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
    <Card style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: color.foreground, flex: 1 }}>
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
          <Text style={{ fontSize: 13, color: color.foreground }}>{rx.diagnosis}</Text>
          <Button
            label="View prescription"
            variant="outline"
            size="sm"
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
            onPress={() => router.push(`/prescription/${rx.id}`)}
          />
        </>
      ) : null}
    </Card>
  );
}

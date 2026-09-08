import { Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { useIntake } from '@/hooks/useIntake';
import { useTheme } from '@/theme/ThemeProvider';

const SEVERITY: Record<string, string> = { MILD: 'Mild', MODERATE: 'Moderate', SEVERE: 'Severe' };

/** The patient's pre-visit answers, for the doctor. Renders nothing if empty. */
export function IntakePanel({ appointmentId }: { appointmentId: string }) {
  const { color } = useTheme();
  const { data } = useIntake(appointmentId);
  if (!data) return null;

  const rows: [string, string | undefined][] = [
    ['Main concern', data.chiefComplaint],
    ['Started', data.symptomsStarted ?? undefined],
    ['Severity', data.severity ? SEVERITY[data.severity] : undefined],
    ['Current medications', data.currentMedications ?? undefined],
    ['Allergies', data.allergies ?? undefined],
    ['Anything else', data.additionalNotes ?? undefined],
  ];

  return (
    <Card style={{ gap: 8, backgroundColor: color.muted }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: color.foreground }}>
        Patient&apos;s pre-visit notes
      </Text>
      {rows.map(([k, v]) =>
        v ? (
          <View key={k} style={{ gap: 1 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: color['muted-foreground'],
              }}
            >
              {k}
            </Text>
            <Text style={{ fontSize: 13, color: color.foreground }}>{v}</Text>
          </View>
        ) : null,
      )}
    </Card>
  );
}

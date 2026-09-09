import type { Vital } from '@carelink/shared';
import { Text, View } from 'react-native';

import { mono } from '@/lib/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, type as t } from '@/theme/tokens';

/** Latest recorded value for each metric, shown as small tiles. */
export function VitalsSummary({ items }: { items: Vital[] }) {
  const { color } = useTheme();
  const sorted = [...items].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  const latest = <K extends keyof Vital>(key: K): Vital[K] | undefined =>
    sorted.find((v) => v[key] != null)?.[key];

  const weight = latest('weightKg');
  const sys = latest('systolic');
  const dia = latest('diastolic');
  const hr = latest('heartRate');
  const sugar = latest('bloodSugarMgDl');
  const temp = latest('temperatureC');

  const tiles: [string, string][] = [];
  if (weight != null) tiles.push(['Weight', `${weight} kg`]);
  if (sys != null && dia != null) tiles.push(['Blood pressure', `${sys}/${dia}`]);
  if (hr != null) tiles.push(['Heart rate', `${hr} bpm`]);
  if (sugar != null) tiles.push(['Blood sugar', `${sugar} mg/dL`]);
  if (temp != null) tiles.push(['Temperature', `${temp} °C`]);

  if (tiles.length === 0) return null;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {tiles.map(([label, value]) => (
        <View
          key={label}
          style={{
            flexGrow: 1,
            flexBasis: '30%',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: color.border,
            backgroundColor: color.card,
            padding: 10,
            gap: 2,
          }}
        >
          <Text style={[t.label, { fontSize: 10, color: color['muted-foreground'] }]}>{label}</Text>
          <Text style={[mono('600'), { fontSize: 16, color: color.foreground }]}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

import type { DoctorSort } from '@carelink/shared';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Select } from '@/components/Select';
import { useDoctors, useMyDoctors, useSpecializations } from '@/hooks/useDoctors';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { fmtDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

const SORTS: { value: DoctorSort; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'fee', label: 'Fee' },
  { value: 'experience', label: 'Experience' },
];

export default function Doctors() {
  const router = useRouter();
  const { color } = useTheme();

  const [q, setQ] = useState('');
  const [specialization, setSpecialization] = useState<string>('');
  const [sort, setSort] = useState<DoctorSort>('name');
  const debouncedQ = useDebouncedValue(q, 350);

  const specs = useSpecializations();
  const visited = useMyDoctors();
  const doctors = useDoctors({
    ...(debouncedQ ? { q: debouncedQ } : {}),
    ...(specialization ? { specialization } : {}),
    sort,
  });

  const specOptions = useMemo(
    () => [
      { label: 'Any specialization', value: '' as const },
      ...(specs.data ?? []).map((s) => ({ label: s, value: s })),
    ],
    [specs.data],
  );

  const seen = visited.data ?? [];

  return (
    <Screen contentStyle={{ gap: 12 }} onRefresh={() => void doctors.refetch()} refreshing={doctors.isRefetching}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: color.foreground }}>Find a doctor</Text>

      {seen.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: color.foreground }}>
            Doctors you&apos;ve seen
          </Text>
          {seen.map((d) => (
            <Card
              key={d.id}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: color.foreground }}>
                  {d.fullName}
                </Text>
                <Text style={{ fontSize: 12, color: color['muted-foreground'] }}>
                  {d.specializations.join(', ')} · last visit {fmtDate(d.lastVisitedAt)}
                </Text>
              </View>
              <Pressable onPress={() => router.push(`/book?doctorId=${d.id}`)} hitSlop={8}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: color.primary }}>Book again</Text>
              </Pressable>
            </Card>
          ))}
        </View>
      ) : null}

      <SearchBar value={q} onChange={setQ} placeholder="Name, specialization, keyword" />
      <Select
        options={specOptions}
        value={specialization}
        onChange={(v) => setSpecialization(v)}
        search={specOptions.length > 8}
      />
      <SegmentedControl options={SORTS} value={sort} onChange={setSort} label="Sort by" />

      {doctors.isLoading ? (
        <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>Loading…</Text>
      ) : doctors.isError ? (
        <Notice tone="danger">Could not load doctors.</Notice>
      ) : (doctors.data ?? []).length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No doctors match"
          subtitle="Try a different name or clear the filters."
        />
      ) : (
        doctors.data!.map((d) => (
          <Pressable key={d.id} onPress={() => router.push(`/doctor/${d.id}`)}>
            <Card style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: color.foreground, flex: 1 }}>
                  {d.fullName}
                </Text>
                <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>
                  ₹{d.consultationFeeInr}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>
                {d.specializations.join(', ')} · {d.qualifications} · {d.yearsExperience} yrs
              </Text>
              {d.bio ? (
                <Text numberOfLines={2} style={{ fontSize: 13, color: color.foreground }}>
                  {d.bio}
                </Text>
              ) : null}
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

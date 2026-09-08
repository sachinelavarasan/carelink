import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';

// Placeholder — Phase 13 (patient vitals log: list + add + delete).
export default function Vitals() {
  return (
    <Screen center>
      <EmptyState icon="pulse-outline" title="Vitals" subtitle="Vitals log lands in Phase 13." />
    </Screen>
  );
}

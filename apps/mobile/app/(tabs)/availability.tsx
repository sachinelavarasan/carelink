import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';

// Placeholder — Phase 15 (doctor weekly rules + exceptions + range close).
export default function Availability() {
  return (
    <Screen center>
      <EmptyState icon="time-outline" title="Availability" subtitle="The editor lands in Phase 15." />
    </Screen>
  );
}

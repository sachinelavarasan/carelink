import type { ReactNode } from 'react';
import type { MedicineItem } from '@carelink/shared';
import { PlusIcon, XIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export interface MedicineRow {
  drugName: string;
  strength: string;
  form: string;
  frequency: string;
  durationDays: number;
  instructions: string;
}

export const blankMedicine = (): MedicineRow => ({
  drugName: '',
  strength: '',
  form: '',
  frequency: '',
  durationDays: 5,
  instructions: '',
});

export const fromMedicineItem = (m: MedicineItem): MedicineRow => ({
  drugName: m.drugName,
  strength: m.strength ?? '',
  form: m.form ?? '',
  frequency: m.frequency,
  durationDays: m.durationDays,
  instructions: m.instructions ?? '',
});

/** Rows with a drug name and a frequency, mapped to the wire shape. */
export const toMedicineItems = (rows: MedicineRow[]): MedicineItem[] =>
  rows
    .filter((r) => r.drugName.trim() && r.frequency.trim())
    .map((r) => ({
      drugName: r.drugName.trim(),
      strength: r.strength.trim() || undefined,
      form: r.form.trim() || undefined,
      frequency: r.frequency.trim(),
      durationDays: Number(r.durationDays) || 1,
      instructions: r.instructions.trim() || undefined,
    }));

export const medicineLabel = (m: MedicineItem): string =>
  `${[m.drugName, m.strength, m.form].filter(Boolean).join(' ')} — ${m.frequency} · ${m.durationDays}d`;

/**
 * A repeatable medicine-line editor, shared by the prescription form and the
 * doctor's "regular medicines" profile section. `rowAction` renders an extra
 * control per row (e.g. "Save as regular").
 */
export function MedicineRows({
  rows,
  onChange,
  minRows = 0,
  addLabel = 'Add medicine',
  rowAction,
}: {
  rows: MedicineRow[];
  onChange: (rows: MedicineRow[]) => void;
  minRows?: number;
  addLabel?: string;
  rowAction?: (row: MedicineRow, index: number) => ReactNode;
}) {
  const patch = (i: number, p: Partial<MedicineRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  const removeAt = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="grid gap-2">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
              {i + 1}
            </span>
            <div className="flex items-center gap-1">
              {rowAction?.(r, i)}
              {rows.length > minRows && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Remove medicine"
                  onClick={() => removeAt(i)}
                >
                  <XIcon />
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_7rem_7rem]">
            <Input
              placeholder="Drug name"
              value={r.drugName}
              onChange={(e) => patch(i, { drugName: e.target.value })}
            />
            <Input
              placeholder="Strength"
              value={r.strength}
              onChange={(e) => patch(i, { strength: e.target.value })}
            />
            <Input
              placeholder="Form"
              value={r.form}
              onChange={(e) => patch(i, { form: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="min-w-48 flex-1"
              placeholder="Frequency (e.g. 1 tab twice daily)"
              value={r.frequency}
              onChange={(e) => patch(i, { frequency: e.target.value })}
            />
            <Input
              type="number"
              className="w-20"
              min={1}
              max={365}
              value={r.durationDays}
              onChange={(e) => patch(i, { durationDays: Number(e.target.value) })}
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>

          <Input
            placeholder="Instructions (e.g. after food)"
            value={r.instructions}
            onChange={(e) => patch(i, { instructions: e.target.value })}
          />
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-self-start"
        onClick={() => onChange([...rows, blankMedicine()])}
      >
        <PlusIcon /> {addLabel}
      </Button>
    </div>
  );
}

import {
  DrugCategoryFlag,
  type DoctorProfileInput,
  type MedicineItem,
  type PrescriptionView,
} from '@carelink/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StarIcon } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { BackLink } from '../components/BackLink';
import {
  MedicineRows,
  blankMedicine,
  fromMedicineItem,
  medicineLabel,
  toMedicineItems,
  type MedicineRow,
} from '../components/MedicineRows';
import { Notice } from '../components/Notice';
import { PrescriptionDetails } from '../components/PrescriptionDetails';
import { Spinner } from '../components/Spinner';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Field, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { api, apiGet, errMessage, isStatus } from '../lib/api';
import { useAuth } from '../lib/auth';

/** The full DoctorProfileInput rebuilt from `me`, for a favourites PUT. */
function doctorProfileInput(
  d: NonNullable<ReturnType<typeof useAuth>['me']>['doctorProfile'],
  favoriteMedicines: MedicineItem[],
): DoctorProfileInput | null {
  if (!d) return null;
  return {
    medicalCouncil: d.medicalCouncil,
    registrationNumber: d.registrationNumber,
    specializations: d.specializations,
    qualifications: d.qualifications,
    yearsExperience: d.yearsExperience,
    bio: d.bio,
    consultationFeeInr: d.consultationFeeInr,
    clinicName: d.clinicName,
    favoriteMedicines,
  };
}

const FLAGS = Object.values(DrugCategoryFlag);
const FLAG_LABEL: Record<string, string> = {
  OTC: 'OTC',
  SCHEDULE_H: 'Schedule H',
  SCHEDULE_H1: 'Schedule H1',
  SCHEDULE_X: 'Schedule X',
};

export default function Prescription() {
  const { appointmentId = '' } = useParams();
  const { me } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isDoctor = me?.user.role === 'DOCTOR';

  const rxQ = useQuery({
    queryKey: ['prescription', appointmentId],
    queryFn: () => apiGet<PrescriptionView>(`/appointments/${appointmentId}/prescription`),
    retry: (n, e) => !isStatus(e, 404) && n < 2,
  });
  const existing = rxQ.data ?? null;
  const missing = rxQ.isError && isStatus(rxQ.error, 404);
  const editable = isDoctor && (!existing || existing.status === 'DRAFT');

  if (rxQ.isLoading) {
    return (
      <AppShell>
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading…
        </p>
      </AppShell>
    );
  }
  if (rxQ.isError && !missing) {
    return (
      <AppShell>
        <BackLink to="/appointments">Appointments</BackLink>
        <Notice kind="error">{errMessage(rxQ.error, 'Could not load the prescription')}</Notice>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BackLink to="/appointments">Appointments</BackLink>
      <h1 className="mb-2 text-xl font-semibold">Prescription</h1>

      {editable ? (
        <PrescriptionForm
          appointmentId={appointmentId}
          existing={existing}
          onDone={() => {
            void qc.invalidateQueries({ queryKey: ['prescription', appointmentId] });
            void qc.invalidateQueries({ queryKey: ['appointments'] });
          }}
          onIssued={() => navigate('/appointments')}
        />
      ) : existing && existing.status === 'FINALIZED' ? (
        <PrescriptionDetails rx={existing} />
      ) : (
        <Notice kind="warning">
          {isDoctor
            ? 'No prescription yet.'
            : 'Your doctor has not issued a prescription for this consultation yet.'}
        </Notice>
      )}
    </AppShell>
  );
}

/* ----------------------------------------------------------------- doctor form */

function PrescriptionForm({
  appointmentId,
  existing,
  onDone,
  onIssued,
}: {
  appointmentId: string;
  existing: PrescriptionView | null;
  onDone: () => void;
  onIssued: () => void;
}) {
  const { me, reload } = useAuth();
  const favorites = me?.doctorProfile?.favoriteMedicines ?? [];

  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<MedicineRow[]>([blankMedicine()]);
  const [error, setError] = useState<string | null>(null);
  const [savedFav, setSavedFav] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setSymptoms(existing.symptoms ?? '');
    setDiagnosis(existing.diagnosis);
    setAdvice(existing.advice ?? '');
    setNotes(existing.notes ?? '');
    setFollowUpDate(existing.followUpDate ?? '');
    setFlags(new Set(existing.drugCategoryFlags));
    setItems(
      existing.items.length > 0 ? existing.items.map(fromMedicineItem) : [blankMedicine()],
    );
  }, [existing]);

  function addFavorite(m: MedicineItem) {
    setItems((rs) => {
      const trimmed = rs.filter((r) => r.drugName.trim() || r.frequency.trim());
      return [...trimmed, fromMedicineItem(m)];
    });
  }

  async function saveAsRegular(row: MedicineRow) {
    const one = toMedicineItems([row])[0];
    if (!one || !me?.doctorProfile) return;
    const already = favorites.some(
      (f) => f.drugName.toLowerCase() === one.drugName.toLowerCase() && f.frequency === one.frequency,
    );
    const input = doctorProfileInput(
      me.doctorProfile,
      already ? favorites : [...favorites, one],
    );
    if (!input) return;
    try {
      if (!already) await api.put('/me/doctor-profile', input);
      await reload();
      setSavedFav(one.drugName);
      setTimeout(() => setSavedFav(null), 2000);
    } catch (e) {
      setError(errMessage(e, 'Could not save the regular medicine'));
    }
  }

  function buildBody() {
    return {
      symptoms: symptoms.trim() || undefined,
      diagnosis: diagnosis.trim(),
      advice: advice.trim() || undefined,
      notes: notes.trim() || undefined,
      followUpDate: followUpDate || undefined,
      drugCategoryFlags: [...flags],
      items: toMedicineItems(items),
    };
  }

  /** Creates or updates the draft; returns its id. */
  async function persist(): Promise<string> {
    const body = buildBody();
    if (body.items.length === 0) throw new Error('Add at least one medicine with a frequency.');
    if (body.diagnosis.length < 2) throw new Error('Enter a diagnosis.');
    if (existing) {
      await api.patch(`/prescriptions/${existing.id}`, body);
      return existing.id;
    }
    const res = await api.post<PrescriptionView>('/prescriptions', { appointmentId, ...body });
    return res.data.id;
  }

  const saveM = useMutation({
    mutationFn: persist,
    onSuccess: () => {
      setError(null);
      onDone();
    },
    onError: (e) => setError(errMessage(e, 'Could not save')),
  });

  const issueM = useMutation({
    mutationFn: async () => {
      const id = await persist();
      await api.post(`/prescriptions/${id}/finalize`, {});
    },
    onSuccess: () => {
      setError(null);
      onDone();
      onIssued();
    },
    onError: (e) => setError(errMessage(e, 'Could not issue')),
  });

  const busy = saveM.isPending || issueM.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    saveM.mutate();
  }

  const medCount = toMedicineItems(items).length;

  return (
    <form onSubmit={onSubmit} className="grid gap-6 pb-20">
      {existing && (
        <Notice kind="warning">
          Draft — not visible to the patient until you issue it. Issuing renders the PDF and marks
          the consultation complete.
        </Notice>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      {savedFav && <Notice kind="success">Saved “{savedFav}” to your regular medicines.</Notice>}

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Assessment
        </h2>
        <Field>
          <FieldLabel>Symptoms</FieldLabel>
          <Textarea rows={2} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>Diagnosis *</FieldLabel>
          <Textarea
            rows={2}
            required
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
        </Field>
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Medicines {medCount > 0 && <span className="text-foreground">· {medCount}</span>}
          </h2>
          {favorites.length > 0 && (
            <Select
              value=""
              onValueChange={(v) => {
                const m = favorites[Number(v)];
                if (m) addFavorite(m);
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Add from regulars…" />
              </SelectTrigger>
              <SelectContent>
                {favorites.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {medicineLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <MedicineRows
          rows={items}
          onChange={setItems}
          minRows={1}
          rowAction={(row) => {
            const one = toMedicineItems([row])[0];
            return one ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                title="Save to your regular medicines"
                onClick={() => void saveAsRegular(row)}
              >
                <StarIcon /> Regular
              </Button>
            ) : null;
          }}
        />
      </section>

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Plan</h2>
        <Field>
          <FieldLabel>Advice</FieldLabel>
          <Textarea rows={2} value={advice} onChange={(e) => setAdvice(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>Clinical notes (not shown to the patient)</FieldLabel>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-end gap-4">
          <Field className="w-44">
            <FieldLabel>Follow-up date</FieldLabel>
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </Field>
          <div className="grid gap-1">
            <span className="text-sm font-medium">Drug categories</span>
            <div className="flex flex-wrap gap-3">
              {FLAGS.map((f) => (
                <label key={f} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={flags.has(f)}
                    onCheckedChange={(v) =>
                      setFlags((s) => {
                        const next = new Set(s);
                        if (v === true) next.add(f);
                        else next.delete(f);
                        return next;
                      })
                    }
                  />
                  {FLAG_LABEL[f] ?? f}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-5 py-3 backdrop-blur sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="outline" disabled={busy}>
            {saveM.isPending ? 'Saving…' : 'Save draft'}
          </Button>
          <Button type="button" disabled={busy} onClick={() => issueM.mutate()}>
            {issueM.isPending ? 'Issuing…' : 'Issue prescription'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {medCount} medicine{medCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </form>
  );
}

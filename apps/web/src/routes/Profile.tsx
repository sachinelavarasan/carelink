import { type FormEvent, useId, useState } from 'react';
import type { DoctorProfileInput, PatientProfileInput } from '@carelink/shared';
import { AppShell } from '../components/AppShell';
import { Notice } from '../components/Notice';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Field, FieldGroup, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { api, errMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

const list = (arr: string[]) => arr.join(', ');
const parseList = (s: string) =>
  s
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
const num = (s: string) => (s.trim() === '' ? undefined : Number(s));

type Me = NonNullable<ReturnType<typeof useAuth>['me']>;

export default function Profile() {
  const { me, reload } = useAuth();
  if (!me) return null;

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-semibold">Your profile</h1>
      <Card>
        <CardContent>
          {me.user.role === 'DOCTOR' ? (
            <DoctorForm me={me} onSaved={reload} />
          ) : (
            <PatientForm me={me} onSaved={reload} />
          )}
        </CardContent>
      </Card>

      {me.user.role === 'PATIENT' && <DeleteAccount />}
    </AppShell>
  );
}

function DeleteAccount() {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.delete('/me', { data: { password, confirm } });
      await logout();
    } catch (err) {
      setError(errMessage(err, 'Could not delete your account'));
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-destructive">Delete account</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Permanently removes your account, profile, appointments, messages and prescriptions. This
        cannot be undone.
      </p>
      {!open ? (
        <Button variant="destructive" size="sm" className="mt-3" onClick={() => setOpen(true)}>
          Delete my account
        </Button>
      ) : (
        <form onSubmit={submit} className="mt-3 grid max-w-sm gap-3">
          {error && <Notice kind="error">{error}</Notice>}
          <Field>
            <FieldLabel>Current password</FieldLabel>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>
              Type <span className="font-mono">DELETE</span> to confirm
            </FieldLabel>
            <Input required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={busy || confirm !== 'DELETE' || !password}
            >
              {busy ? 'Deleting…' : 'Permanently delete'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function useSaver<T>(path: string, onSaved: () => Promise<void>) {
  const [state, setState] = useState<{ busy: boolean; error?: string; ok?: boolean }>({
    busy: false,
  });
  const save = async (payload: T) => {
    setState({ busy: true });
    try {
      await api.put(path, payload);
      await onSaved();
      setState({ busy: false, ok: true });
    } catch (err) {
      setState({ busy: false, error: errMessage(err, 'Save failed') });
    }
  };
  return { ...state, save };
}

function TextField({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </Field>
  );
}

function PatientForm({ me, onSaved }: { me: Me; onSaved: () => Promise<void> }) {
  const p = me.patientProfile;
  const genderId = useId();
  const [f, setF] = useState({
    dob: p?.dob ?? '',
    gender: p?.gender ?? 'MALE',
    bloodGroup: p?.bloodGroup ?? '',
    heightCm: p?.heightCm?.toString() ?? '',
    weightKg: p?.weightKg?.toString() ?? '',
    address: p?.address ?? '',
    emergencyContactName: p?.emergencyContactName ?? '',
    emergencyContactPhone: p?.emergencyContactPhone ?? '',
    allergies: list(p?.allergies ?? []),
    chronicConditions: list(p?.chronicConditions ?? []),
  });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const { busy, error, ok, save } = useSaver<PatientProfileInput>('/me/patient-profile', onSaved);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void save({
      dob: f.dob,
      gender: f.gender as PatientProfileInput['gender'],
      bloodGroup: f.bloodGroup || undefined,
      heightCm: num(f.heightCm),
      weightKg: num(f.weightKg),
      address: f.address || undefined,
      emergencyContactName: f.emergencyContactName || undefined,
      emergencyContactPhone: f.emergencyContactPhone || undefined,
      allergies: parseList(f.allergies),
      chronicConditions: parseList(f.chronicConditions),
    });
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <Notice kind="error">{error}</Notice>}
      {ok && <Notice kind="success">Saved.</Notice>}
      <FieldGroup>
        <TextField label="Date of birth" type="date" required value={f.dob} onChange={set('dob')} />
        <Field>
          <FieldLabel htmlFor={genderId}>Gender</FieldLabel>
          <Select value={f.gender} onValueChange={(v) => v && set('gender')(v)}>
            <SelectTrigger id={genderId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <TextField label="Blood group" value={f.bloodGroup} onChange={set('bloodGroup')} placeholder="O+" />
        <TextField label="Height (cm)" type="number" value={f.heightCm} onChange={set('heightCm')} />
        <TextField label="Weight (kg)" type="number" value={f.weightKg} onChange={set('weightKg')} />
        <TextField label="Address" value={f.address} onChange={set('address')} />
        <TextField
          label="Emergency contact name"
          value={f.emergencyContactName}
          onChange={set('emergencyContactName')}
        />
        <TextField
          label="Emergency contact phone"
          value={f.emergencyContactPhone}
          onChange={set('emergencyContactPhone')}
        />
        <TextField
          label="Allergies (comma-separated)"
          value={f.allergies}
          onChange={set('allergies')}
        />
        <TextField
          label="Chronic conditions (comma-separated)"
          value={f.chronicConditions}
          onChange={set('chronicConditions')}
        />
        <Button type="submit" className="w-fit" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </Button>
      </FieldGroup>
    </form>
  );
}

function DoctorForm({ me, onSaved }: { me: Me; onSaved: () => Promise<void> }) {
  const d = me.doctorProfile;
  const [f, setF] = useState({
    medicalCouncil: d?.medicalCouncil ?? '',
    registrationNumber: d?.registrationNumber ?? '',
    specializations: list(d?.specializations ?? []),
    qualifications: d?.qualifications ?? '',
    yearsExperience: d?.yearsExperience?.toString() ?? '0',
    consultationFeeInr: d?.consultationFeeInr?.toString() ?? '0',
    clinicName: d?.clinicName ?? '',
    bio: d?.bio ?? '',
  });
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const { busy, error, ok, save } = useSaver<DoctorProfileInput>('/me/doctor-profile', onSaved);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void save({
      medicalCouncil: f.medicalCouncil,
      registrationNumber: f.registrationNumber,
      specializations: parseList(f.specializations),
      qualifications: f.qualifications,
      yearsExperience: Number(f.yearsExperience) || 0,
      consultationFeeInr: Number(f.consultationFeeInr) || 0,
      clinicName: f.clinicName || undefined,
      bio: f.bio || undefined,
    });
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <Notice kind="error">{error}</Notice>}
      {ok && <Notice kind="success">Saved.</Notice>}
      <FieldGroup>
        <TextField label="Medical council" required value={f.medicalCouncil} onChange={set('medicalCouncil')} />
        <TextField
          label="Registration number"
          required
          value={f.registrationNumber}
          onChange={set('registrationNumber')}
        />
        <TextField
          label="Specializations (comma-separated)"
          required
          value={f.specializations}
          onChange={set('specializations')}
        />
        <TextField label="Qualifications" required value={f.qualifications} onChange={set('qualifications')} />
        <TextField
          label="Years of experience"
          type="number"
          value={f.yearsExperience}
          onChange={set('yearsExperience')}
        />
        <TextField
          label="Consultation fee (₹)"
          type="number"
          value={f.consultationFeeInr}
          onChange={set('consultationFeeInr')}
        />
        <TextField label="Clinic name" value={f.clinicName} onChange={set('clinicName')} />
        <TextField label="Short bio" value={f.bio} onChange={set('bio')} />
        <Button type="submit" className="w-fit" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </Button>
      </FieldGroup>
    </form>
  );
}

import { type FormEvent, useId, useState } from 'react';
import type { DoctorProfileInput, PatientProfileInput } from '@carelink/shared';
import { BadgeCheckIcon, ClockIcon } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { AvatarUpload } from '../components/AvatarUpload';
import { MedicineRows, fromMedicineItem, toMedicineItems, type MedicineRow } from '../components/MedicineRows';
import { Notice } from '../components/Notice';
import { RoleBadge } from '../components/RoleBadge';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Field, FieldGroup, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
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
  const isDoctor = me.user.role === 'DOCTOR';

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-semibold">{isDoctor ? 'Doctor profile' : 'Patient profile'}</h1>

      <ProfileHeader me={me} onAvatarChanged={reload} />

      <Card className="mt-4">
        <CardContent>
          {isDoctor ? (
            <DoctorForm me={me} onSaved={reload} />
          ) : (
            <PatientForm me={me} onSaved={reload} />
          )}
        </CardContent>
      </Card>

      {!isDoctor && <DeleteAccount />}
    </AppShell>
  );
}

/** Identity card at the top of the profile — who this account is and, for a
 *  doctor, whether they're verified. */
function ProfileHeader({ me, onAvatarChanged }: { me: Me; onAvatarChanged: () => Promise<void> }) {
  const isDoctor = me.user.role === 'DOCTOR';
  const verified = Boolean(me.doctorProfile?.verifiedAt);
  const d = me.doctorProfile;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4">
        <AvatarUpload
          name={me.user.fullName}
          src={me.user.avatarUrl}
          onChanged={onAvatarChanged}
        />
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold">{me.user.fullName}</span>
            <RoleBadge role={me.user.role} />
            {isDoctor &&
              (verified ? (
                <Badge variant="outline" className="border border-success-border bg-success-bg text-success-fg gap-1">
                  <BadgeCheckIcon aria-hidden />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="border border-warning-border bg-warning-bg text-warning-fg gap-1">
                  <ClockIcon aria-hidden />
                  Verification pending
                </Badge>
              ))}
          </div>
          <p className="text-sm text-muted-foreground">{me.user.email}</p>
          {isDoctor && d && (d.medicalCouncil || d.registrationNumber) && (
            <p className="text-sm text-muted-foreground">
              {[d.medicalCouncil, d.registrationNumber && `Reg. No. ${d.registrationNumber}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {!isDoctor && me.patientProfile?.dob && (
            <p className="text-sm text-muted-foreground">Born {me.patientProfile.dob}</p>
          )}
        </div>
      </CardContent>
    </Card>
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

function TextAreaField({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.ComponentProps<typeof Textarea>, 'value' | 'onChange'>) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
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
    clinicAddress: d?.clinicAddress ?? '',
    clinicMapUrl: d?.clinicMapUrl ?? '',
    clinicPhone: d?.clinicPhone ?? '',
    bio: d?.bio ?? '',
  });
  const [meds, setMeds] = useState<MedicineRow[]>(
    () => (d?.favoriteMedicines ?? []).map(fromMedicineItem),
  );
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
      clinicAddress: f.clinicAddress || undefined,
      clinicMapUrl: f.clinicMapUrl || undefined,
      clinicPhone: f.clinicPhone || undefined,
      bio: f.bio || undefined,
      favoriteMedicines: toMedicineItems(meds),
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
        <TextAreaField
          label="Clinic address"
          value={f.clinicAddress}
          onChange={set('clinicAddress')}
          rows={2}
        />
        <TextField
          label="Map link"
          type="url"
          inputMode="url"
          placeholder="https://maps.google.com/?q=…"
          value={f.clinicMapUrl}
          onChange={set('clinicMapUrl')}
        />
        <TextField
          label="Clinic phone"
          type="tel"
          value={f.clinicPhone}
          onChange={set('clinicPhone')}
        />
        <TextField label="Short bio" value={f.bio} onChange={set('bio')} />

        <div className="grid gap-2">
          <span className="text-sm font-medium">Regular medicines</span>
          <p className="text-sm text-muted-foreground">
            Save the medicines you prescribe often — you can drop them into a prescription in one
            click.
          </p>
          <MedicineRows rows={meds} onChange={setMeds} addLabel="Add a regular medicine" />
        </div>

        <Button type="submit" className="w-fit" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </Button>
      </FieldGroup>
    </form>
  );
}

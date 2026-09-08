import { type FormEvent, useId, useState } from 'react';
import type { DoctorProfileInput, PatientProfileInput } from '@carelink/shared';
import { BadgeCheckIcon, CalendarIcon, ClockIcon, PencilIcon } from 'lucide-react';
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
import { api, downloadFile, errMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDate, fmtDateTime } from '../lib/format';

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

      <ProfileHeader me={me} onSaved={reload} />

      <Card className="mt-4">
        <CardContent>
          {isDoctor ? (
            <DoctorForm me={me} onSaved={reload} />
          ) : (
            <PatientForm me={me} onSaved={reload} />
          )}
        </CardContent>
      </Card>

      {!isDoctor && <ExportData />}
      {!isDoctor && <DeleteAccount />}
    </AppShell>
  );
}

/** DPDP right to access — download the full personal record as JSON. */
function ExportData() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await downloadFile('/me/export', 'carelink-export.json');
    } catch (err) {
      setError(errMessage(err, 'Could not export your data'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold">Your data</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Download everything CareLink holds about you — profile, appointments, prescriptions and
        messages — as a JSON file.
      </p>
      {error && (
        <div className="mt-3">
          <Notice kind="error">{error}</Notice>
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? 'Preparing…' : 'Download my data'}
      </Button>
    </section>
  );
}

/** Identity card at the top of the profile — who this account is, when it was
 *  last changed, and an inline editor for name / phone (and DOB for patients). */
function ProfileHeader({ me, onSaved }: { me: Me; onSaved: () => Promise<void> }) {
  const isDoctor = me.user.role === 'DOCTOR';
  const verified = Boolean(me.doctorProfile?.verifiedAt);
  const d = me.doctorProfile;
  const p = me.patientProfile;

  const lastUpdated = [me.user.updatedAt, p?.updatedAt, me.doctorProfile?.updatedAt]
    .filter((x): x is string => Boolean(x))
    .sort()
    .at(-1);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me.user.fullName);
  const [phone, setPhone] = useState(me.user.phone ?? '');
  const [dob, setDob] = useState(p?.dob ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setName(me.user.fullName);
    setPhone(me.user.phone ?? '');
    setDob(p?.dob ?? '');
    setError(null);
    setEditing(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const accountChanged =
        name.trim() !== me.user.fullName || (phone.trim() || null) !== (me.user.phone ?? null);
      if (accountChanged) {
        await api.patch('/me', { fullName: name.trim(), phone: phone.trim() || undefined });
      }
      if (!isDoctor && p && dob && dob !== p.dob) {
        await api.put('/me/patient-profile', {
          dob,
          gender: p.gender,
          bloodGroup: p.bloodGroup,
          heightCm: p.heightCm,
          weightKg: p.weightKg,
          address: p.address,
          emergencyContactName: p.emergencyContactName,
          emergencyContactPhone: p.emergencyContactPhone,
          allergies: p.allergies,
          chronicConditions: p.chronicConditions,
        });
      }
      await onSaved();
      setEditing(false);
    } catch (err) {
      setError(errMessage(err, 'Could not save'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start gap-4">
        <AvatarUpload name={me.user.fullName} src={me.user.avatarUrl} onChanged={onSaved} />

        {editing ? (
          <form onSubmit={save} className="grid flex-1 gap-3 sm:max-w-sm">
            {error && <Notice kind="error">{error}</Notice>}
            <Field>
              <FieldLabel>Full name</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </Field>
            <Field>
              <FieldLabel>Phone</FieldLabel>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </Field>
            {!isDoctor && p && (
              <Field>
                <FieldLabel>Date of birth</FieldLabel>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </Field>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid flex-1 gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">{me.user.fullName}</span>
              <RoleBadge role={me.user.role} />
              {isDoctor &&
                (verified ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border border-success-border bg-success-bg text-success-fg"
                  >
                    <BadgeCheckIcon aria-hidden />
                    Verified
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 border border-warning-border bg-warning-bg text-warning-fg"
                  >
                    <ClockIcon aria-hidden />
                    Verification pending
                  </Badge>
                ))}
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="ml-auto"
                onClick={startEdit}
              >
                <PencilIcon /> Edit
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{me.user.email}</p>
            {me.user.phone && <p className="text-sm text-muted-foreground">{me.user.phone}</p>}
            {isDoctor && d && (d.medicalCouncil || d.registrationNumber) && (
              <p className="text-sm text-muted-foreground">
                {[d.medicalCouncil, d.registrationNumber && `Reg. No. ${d.registrationNumber}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {!isDoctor && p?.dob && (
              <p className="text-sm text-muted-foreground">Born {fmtDate(p.dob)}</p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                <CalendarIcon className="size-3" aria-hidden />
                Joined {fmtDate(me.user.createdAt)}
              </span>
              {lastUpdated && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  <ClockIcon className="size-3" aria-hidden />
                  Updated {fmtDateTime(lastUpdated)}
                </span>
              )}
            </div>
          </div>
        )}
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
        {/* DOB is edited from the identity card above once the profile exists;
            shown here only for first-time setup. */}
        {!p && (
          <TextField
            label="Date of birth"
            type="date"
            required
            value={f.dob}
            onChange={set('dob')}
          />
        )}
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

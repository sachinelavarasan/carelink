import {
  DrugCategoryFlag,
  type PrescriptionTemplate,
  type PrescriptionTemplateInput,
} from '@carelink/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileStackIcon,
  FileTextIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { EmptyState } from '../components/EmptyState';
import { NoMatches, TablePanel, TableSkeleton, useClientPaging } from '../components/TablePanel';
import {
  MedicineRows,
  blankMedicine,
  fromMedicineItem,
  toMedicineItems,
  type MedicineRow,
} from '../components/MedicineRows';
import { Notice } from '../components/Notice';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import { api, apiGet, errMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

const FLAGS = Object.values(DrugCategoryFlag);
const FLAG_LABEL: Record<string, string> = {
  OTC: 'OTC',
  SCHEDULE_H: 'Schedule H',
  SCHEDULE_H1: 'Schedule H1',
  SCHEDULE_X: 'Schedule X',
};
const templatesKey = ['prescription-templates'];

export default function PrescriptionTemplates() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PrescriptionTemplate | 'new' | null>(null);

  const q = useQuery({
    queryKey: templatesKey,
    queryFn: () => apiGet<PrescriptionTemplate[]>('/me/prescription-templates'),
    enabled: me?.user.role === 'DOCTOR',
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/me/prescription-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: templatesKey }),
  });

  const [query, setQuery] = useState('');

  const all = q.data ?? [];
  const templates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        (t.diagnosis ?? '').toLowerCase().includes(needle),
    );
  }, [all, query]);

  const { page, setPage, pageCount, pageItems, pageSize, total } = useClientPaging(templates, {
    resetKey: query,
  });

  if (me && me.user.role !== 'DOCTOR') return <Navigate to="/" replace />;

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Prescription templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable skeletons you can drop into a new prescription in one click.
          </p>
        </div>
        {editing == null && (
          <Button size="sm" onClick={() => setEditing('new')}>
            <PlusIcon /> New template
          </Button>
        )}
      </div>

      {editing != null && (
        <Card className="mt-4">
          <CardContent>
            <TemplateEditor
              existing={editing === 'new' ? null : editing}
              onCancel={() => setEditing(null)}
              onSaved={async () => {
                await qc.invalidateQueries({ queryKey: templatesKey });
                setEditing(null);
              }}
            />
          </CardContent>
        </Card>
      )}

      <div className="mt-4">
        {q.isLoading ? (
          <TableSkeleton cols={5} rows={4} />
        ) : q.isError ? (
          <Notice kind="error">Could not load your templates.</Notice>
        ) : all.length === 0 ? (
          editing == null ? (
            <EmptyState
              icon={FileStackIcon}
              title="No templates yet"
              description="Save a common prescription as a template to reuse it later."
            />
          ) : null
        ) : (
          <TablePanel
            title="Templates"
            count={templates.length}
            page={page}
            pageCount={pageCount}
            onPage={setPage}
            pageSize={pageSize}
            total={total}
            toolbar={
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 w-48 pl-7"
                  placeholder="Search name or diagnosis…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            }
          >
            {templates.length === 0 ? (
              <NoMatches>No templates match “{query}”.</NoMatches>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead className="text-right">Medicines</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <FileTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                          {t.name}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[36ch] truncate text-muted-foreground">
                        {t.diagnosis || '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{t.items.length}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.followUpDays ? `+${t.followUpDays}d` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Edit template"
                            onClick={() => setEditing(t)}
                          >
                            <PencilIcon />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Delete template"
                            onClick={() => {
                              if (window.confirm(`Delete the “${t.name}” template?`))
                                remove.mutate(t.id);
                            }}
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TablePanel>
        )}
      </div>
    </AppShell>
  );
}

function TemplateEditor({
  existing,
  onSaved,
  onCancel,
}: {
  existing: PrescriptionTemplate | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [symptoms, setSymptoms] = useState(existing?.symptoms ?? '');
  const [diagnosis, setDiagnosis] = useState(existing?.diagnosis ?? '');
  const [advice, setAdvice] = useState(existing?.advice ?? '');
  const [followUpDays, setFollowUpDays] = useState(
    existing?.followUpDays != null ? String(existing.followUpDays) : '',
  );
  const [flags, setFlags] = useState<Set<string>>(new Set(existing?.drugCategoryFlags ?? []));
  const [items, setItems] = useState<MedicineRow[]>(
    existing && existing.items.length > 0 ? existing.items.map(fromMedicineItem) : [blankMedicine()],
  );
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const body: PrescriptionTemplateInput = {
        name: name.trim(),
        symptoms: symptoms.trim() || undefined,
        diagnosis: diagnosis.trim() || undefined,
        advice: advice.trim() || undefined,
        followUpDays: followUpDays.trim() ? Number(followUpDays) : undefined,
        drugCategoryFlags: [...flags] as PrescriptionTemplateInput['drugCategoryFlags'],
        items: toMedicineItems(items),
      };
      return existing
        ? api.patch(`/me/prescription-templates/${existing.id}`, body)
        : api.post('/me/prescription-templates', body);
    },
    onSuccess: () => {
      setError(null);
      onSaved();
    },
    onError: (e) => setError(errMessage(e, 'Could not save')),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 1) {
      setError('Give the template a name.');
      return;
    }
    save.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <h2 className="text-sm font-semibold">{existing ? 'Edit template' : 'New template'}</h2>
      {error && <Notice kind="error">{error}</Notice>}
      <FieldGroup>
        <Field>
          <FieldLabel>Name *</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field>
          <FieldLabel>Symptoms</FieldLabel>
          <Textarea rows={2} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>Diagnosis</FieldLabel>
          <Textarea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>Advice</FieldLabel>
          <Textarea rows={2} value={advice} onChange={(e) => setAdvice(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-end gap-4">
          <Field className="w-44">
            <FieldLabel>Follow-up in (days)</FieldLabel>
            <Input
              type="number"
              min={1}
              max={365}
              value={followUpDays}
              onChange={(e) => setFollowUpDays(e.target.value)}
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
        <div className="grid gap-2">
          <span className="text-sm font-medium">Medicines</span>
          <MedicineRows rows={items} onChange={setItems} />
        </div>
      </FieldGroup>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save template'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

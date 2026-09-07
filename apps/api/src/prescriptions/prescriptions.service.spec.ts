import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../common/current-user.decorator';
import { appointments as appointmentsTable } from '../db/schema';
import { PrescriptionsService } from './prescriptions.service';

const doctor: AuthUser = { id: 'doc', role: 'DOCTOR' };
const patient: AuthUser = { id: 'pat', role: 'PATIENT' };
const stranger: AuthUser = { id: 'x', role: 'PATIENT' };

const appt = {
  id: 'ap1',
  patientId: patient.id,
  doctorId: doctor.id,
  status: 'CONFIRMED' as const,
  reasonForVisit: 'cough',
  scheduledStart: new Date('2026-02-01T09:00:00Z'),
};

interface Opts {
  appt?: Record<string, unknown> | null;
  prescription?: Record<string, unknown> | null;
  storageConfigured?: boolean;
}

function makeService(opts: Opts = {}) {
  const enqueueMany = vi.fn().mockResolvedValue(undefined);
  const uploadPrescriptionPdf = vi.fn().mockResolvedValue('carelink/prescriptions/rx1');
  const fetchPdf = vi.fn().mockResolvedValue(null);
  const storage = {
    configured: opts.storageConfigured ?? false,
    uploadPrescriptionPdf,
    fetchPdf,
  };

  const apptUpdate = vi.fn().mockResolvedValue(undefined);
  const rxUpdate = vi.fn().mockResolvedValue(undefined);

  const selectChain: Record<string, unknown> = {
    from: () => selectChain,
    where: () => selectChain,
    orderBy: () => selectChain,
    limit: () => Promise.resolve([]),
    then: (res: (v: unknown[]) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve([]).then(res, rej),
  };

  const tx = {
    insert: () => ({
      values: () => ({ returning: () => Promise.resolve([{ id: 'rx1' }]) }),
    }),
    update: (table: unknown) => ({
      set: () => ({ where: table === appointmentsTable ? apptUpdate : rxUpdate }),
    }),
    delete: () => ({ where: () => Promise.resolve(undefined) }),
  };

  const db = {
    query: {
      appointments: { findFirst: vi.fn().mockResolvedValue(opts.appt ?? appt) },
      prescriptions: { findFirst: vi.fn().mockResolvedValue(opts.prescription ?? null) },
      doctorProfiles: {
        findFirst: vi.fn().mockResolvedValue({
          qualifications: 'MBBS',
          medicalCouncil: 'TNMC',
          registrationNumber: 'TNMC-1',
        }),
      },
      users: { findFirst: vi.fn().mockResolvedValue({ fullName: 'Test Name' }) },
    },
    select: () => selectChain,
    transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new PrescriptionsService(db as any, { enqueueMany } as any, storage as any);
  return { service, enqueueMany, uploadPrescriptionPdf, apptUpdate, rxUpdate };
}

describe('PrescriptionsService.create', () => {
  it('forbids a doctor who did not own the appointment', async () => {
    const { service } = makeService({ appt: { ...appt, doctorId: 'someone-else' } });
    await expect(
      service.create(doctor, { appointmentId: 'ap1', diagnosis: 'x', drugCategoryFlags: [], items: [] as never }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when the appointment was cancelled', async () => {
    const { service } = makeService({ appt: { ...appt, status: 'CANCELLED' } });
    await expect(
      service.create(doctor, { appointmentId: 'ap1', diagnosis: 'x', drugCategoryFlags: [], items: [] as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a second prescription for the same appointment', async () => {
    const { service } = makeService({ prescription: { id: 'existing' } });
    await expect(
      service.create(doctor, { appointmentId: 'ap1', diagnosis: 'x', drugCategoryFlags: [], items: [] as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PrescriptionsService.update', () => {
  it('forbids a non-owner', async () => {
    const { service } = makeService({ prescription: { id: 'rx1', doctorId: 'other', finalizedAt: null } });
    await expect(
      service.update(doctor, 'rx1', { diagnosis: 'x', drugCategoryFlags: [], items: [] as never }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses to edit a finalised prescription', async () => {
    const { service } = makeService({
      prescription: { id: 'rx1', doctorId: doctor.id, finalizedAt: new Date() },
    });
    await expect(
      service.update(doctor, 'rx1', { diagnosis: 'x', drugCategoryFlags: [], items: [] as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PrescriptionsService.finalize', () => {
  const draft = {
    id: 'rx1',
    appointmentId: 'ap1',
    doctorId: doctor.id,
    patientId: patient.id,
    finalizedAt: null,
    issuedAt: new Date('2026-02-01T09:10:00Z'),
    symptoms: null,
    diagnosis: 'viral URI',
    advice: null,
    notes: 'seen alone',
    followUpDate: null,
    drugCategoryFlags: [],
    pdfKey: null,
  };

  it('marks the appointment COMPLETED and notifies the patient (push + email)', async () => {
    const { service, enqueueMany, apptUpdate, uploadPrescriptionPdf } = makeService({
      prescription: draft,
    });
    const view = await service.finalize(doctor, 'rx1');

    expect(view.status).toBe('FINALIZED');
    expect(apptUpdate).toHaveBeenCalledOnce();
    expect(uploadPrescriptionPdf).not.toHaveBeenCalled(); // storage not configured
    expect(enqueueMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: patient.id, kind: 'prescription_ready', channel: 'PUSH' }),
      expect.objectContaining({ userId: patient.id, kind: 'prescription_ready', channel: 'EMAIL' }),
    ]);
  });

  it('uploads the PDF when storage is configured', async () => {
    const { service, uploadPrescriptionPdf } = makeService({
      prescription: draft,
      storageConfigured: true,
    });
    await service.finalize(doctor, 'rx1');
    expect(uploadPrescriptionPdf).toHaveBeenCalledOnce();
  });

  it('is idempotent once finalised', async () => {
    const { service, enqueueMany } = makeService({
      prescription: { ...draft, finalizedAt: new Date() },
    });
    const view = await service.finalize(doctor, 'rx1');
    expect(view.status).toBe('FINALIZED');
    expect(enqueueMany).not.toHaveBeenCalled();
  });
});

describe('PrescriptionsService.get authorization', () => {
  it('forbids a stranger', async () => {
    const { service } = makeService({
      prescription: { id: 'rx1', doctorId: doctor.id, patientId: patient.id, finalizedAt: new Date() },
    });
    await expect(service.get(stranger, 'rx1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('hides a draft from the patient', async () => {
    const { service } = makeService({
      prescription: { id: 'rx1', doctorId: doctor.id, patientId: patient.id, finalizedAt: null },
    });
    await expect(service.get(patient, 'rx1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

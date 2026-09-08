import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../common/current-user.decorator';
import type { Database } from '../db';
import { IntakeService } from './intake.service';

const patient: AuthUser = { id: 'pat', role: 'PATIENT' };
const doctor: AuthUser = { id: 'doc', role: 'DOCTOR' };
const stranger: AuthUser = { id: 'x', role: 'PATIENT' };

const appt = { id: 'ap1', patientId: 'pat', doctorId: 'doc', status: 'CONFIRMED' as const };
const body = { chiefComplaint: 'sore throat', severity: 'MODERATE' as const };

function makeService(
  opts: { appt?: Record<string, unknown> | null; intake?: Record<string, unknown> | null } = {},
) {
  const returning = vi.fn().mockResolvedValue([
    {
      appointmentId: 'ap1',
      chiefComplaint: 'sore throat',
      symptomsStarted: null,
      severity: 'MODERATE',
      currentMedications: null,
      allergies: null,
      additionalNotes: null,
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    },
  ]);
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate: () => ({ returning }) });
  const insert = vi.fn().mockReturnValue({ values });
  const db = {
    query: {
      appointments: {
        findFirst: vi.fn().mockResolvedValue(opts.appt === undefined ? appt : opts.appt),
      },
      appointmentIntakes: { findFirst: vi.fn().mockResolvedValue(opts.intake ?? null) },
    },
    insert,
  };
  return { service: new IntakeService({ db } as unknown as Database), insert, values, returning };
}

describe('IntakeService.get', () => {
  it('forbids a non-participant', async () => {
    const { service } = makeService();
    await expect(service.get(stranger, 'ap1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404s when the appointment is missing', async () => {
    const { service } = makeService({ appt: null });
    await expect(service.get(patient, 'ap1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns null when no intake has been filled', async () => {
    const { service } = makeService();
    expect(await service.get(doctor, 'ap1')).toBeNull();
  });

  it('maps a stored row to the view (null → undefined)', async () => {
    const { service } = makeService({
      intake: {
        appointmentId: 'ap1',
        chiefComplaint: 'headache',
        symptomsStarted: null,
        severity: null,
        currentMedications: null,
        allergies: null,
        additionalNotes: null,
        updatedAt: new Date('2026-02-01T00:00:00Z'),
      },
    });
    const out = await service.get(doctor, 'ap1');
    expect(out).toEqual({
      appointmentId: 'ap1',
      chiefComplaint: 'headache',
      updatedAt: '2026-02-01T00:00:00.000Z',
    });
  });
});

describe('IntakeService.upsert', () => {
  it('forbids the doctor from filling it', async () => {
    const { service } = makeService();
    await expect(service.upsert(doctor, 'ap1', body)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a completed consultation', async () => {
    const { service } = makeService({ appt: { ...appt, status: 'COMPLETED' } });
    await expect(service.upsert(patient, 'ap1', body)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a cancelled consultation', async () => {
    const { service } = makeService({ appt: { ...appt, status: 'CANCELLED' } });
    await expect(service.upsert(patient, 'ap1', body)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('writes the row and returns the view for the patient', async () => {
    const { service, values } = makeService();
    const out = await service.upsert(patient, 'ap1', body);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ appointmentId: 'ap1', chiefComplaint: 'sore throat', severity: 'MODERATE' }),
    );
    expect(out.chiefComplaint).toBe('sore throat');
    expect(out.appointmentId).toBe('ap1');
  });
});

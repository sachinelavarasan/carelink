import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../common/current-user.decorator';
import { VideoService } from './video.service';

const patient: AuthUser = { id: 'pat', role: 'PATIENT' };
const doctor: AuthUser = { id: 'doc', role: 'DOCTOR' };
const stranger: AuthUser = { id: 'x', role: 'PATIENT' };

const inWindowAppt = {
  id: 'ap1',
  patientId: patient.id,
  doctorId: doctor.id,
  status: 'CONFIRMED' as const,
  scheduledStart: new Date(Date.now() - 60_000),
  scheduledEnd: new Date(Date.now() + 20 * 60_000),
};
const pastAppt = {
  ...inWindowAppt,
  scheduledStart: new Date(Date.now() - 5 * 3_600_000),
  scheduledEnd: new Date(Date.now() - 4 * 3_600_000),
};

function makeService(opts: {
  appt?: Record<string, unknown>;
  session?: Record<string, unknown> | null;
}) {
  const enqueueMany = vi.fn().mockResolvedValue(undefined);
  const state = { row: opts.session ?? null };

  const insertReturning = vi.fn(async () => {
    state.row = {
      id: 'v1',
      appointmentId: 'ap1',
      roomName: 'carelink-generated',
      startedAt: null,
      endedAt: null,
    };
    return [state.row];
  });
  const updateReturning = vi.fn(async () => [state.row]);

  const db = {
    query: {
      appointments: { findFirst: vi.fn().mockResolvedValue(opts.appt ?? inWindowAppt) },
      videoSessions: { findFirst: vi.fn(async () => state.row) },
    },
    insert: () => ({
      values: () => ({ onConflictDoNothing: () => ({ returning: insertReturning }) }),
    }),
    update: () => ({
      set: (patch: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            state.row = { ...(state.row as object), ...patch };
            return updateReturning();
          },
        }),
      }),
    }),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new VideoService({ db } as any, { enqueueMany } as any, {
    get: () => 'meet.jit.si',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  return { service, enqueueMany, state };
}

describe('VideoService.getForAppointment', () => {
  it('forbids a non-participant', async () => {
    const { service } = makeService({});
    await expect(service.getForAppointment(stranger, 'ap1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('creates the room lazily and reports it joinable inside the window', async () => {
    const { service } = makeService({ session: null });
    const v = await service.getForAppointment(patient, 'ap1');
    expect(v.roomName).toBe('carelink-generated');
    expect(v.joinUrl).toBe('https://meet.jit.si/carelink-generated');
    expect(v.state).toBe('PENDING');
    expect(v.canJoin).toBe(true);
  });

  it('is not joinable outside the window', async () => {
    const { service } = makeService({ appt: pastAppt, session: null });
    const v = await service.getForAppointment(patient, 'ap1');
    expect(v.canJoin).toBe(false);
  });
});

describe('VideoService.start', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stamps startedAt and notifies the patient when the doctor starts', async () => {
    const { service, enqueueMany, state } = makeService({ session: null });
    const v = await service.start(doctor, 'ap1');
    expect(v.state).toBe('LIVE');
    expect((state.row as { startedAt: unknown }).startedAt).toBeInstanceOf(Date);
    expect(enqueueMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: patient.id, kind: 'video_started', channel: 'PUSH' }),
    ]);
  });

  it('does not notify when the patient starts, and is idempotent', async () => {
    const { service, enqueueMany } = makeService({
      session: { id: 'v1', appointmentId: 'ap1', roomName: 'r', startedAt: new Date(), endedAt: null },
    });
    await service.start(patient, 'ap1');
    expect(enqueueMany).not.toHaveBeenCalled();
  });

  it('rejects starting outside the window', async () => {
    const { service } = makeService({ appt: pastAppt, session: null });
    await expect(service.start(doctor, 'ap1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lets a dropped call be rejoined while the window is still open', async () => {
    const { service, enqueueMany, state } = makeService({
      session: {
        id: 'v1',
        appointmentId: 'ap1',
        roomName: 'r',
        startedAt: new Date(Date.now() - 600_000),
        endedAt: new Date(),
      },
    });
    const v = await service.start(doctor, 'ap1');
    expect(v.state).toBe('LIVE');
    expect((state.row as { endedAt: unknown }).endedAt).toBeNull();
    expect(enqueueMany).not.toHaveBeenCalled(); // not a first start
  });
});

describe('VideoService.end', () => {
  it('stamps endedAt but the call stays joinable inside the window', async () => {
    const { service, state } = makeService({
      session: { id: 'v1', appointmentId: 'ap1', roomName: 'r', startedAt: new Date(), endedAt: null },
    });
    const v = await service.end(patient, 'ap1');
    expect((state.row as { endedAt: unknown }).endedAt).toBeInstanceOf(Date);
    expect(v.canJoin).toBe(true);
    expect(v.state).toBe('PENDING');
  });

  it('reads as ENDED once the window has closed', async () => {
    const { service } = makeService({
      appt: pastAppt,
      session: {
        id: 'v1',
        appointmentId: 'ap1',
        roomName: 'r',
        startedAt: new Date(Date.now() - 3 * 3_600_000),
        endedAt: new Date(Date.now() - 3 * 3_600_000),
      },
    });
    const v = await service.getForAppointment(patient, 'ap1');
    expect(v.state).toBe('ENDED');
    expect(v.canJoin).toBe(false);
  });
});

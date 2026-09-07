import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../common/current-user.decorator';
import { ChatService, threadState } from './chat.service';

const HOUR = 3_600_000;

describe('threadState', () => {
  const thread = {
    opensAt: new Date('2025-01-01T10:00:00Z'),
    closesAt: new Date('2025-01-08T10:00:00Z'),
  };
  it('is PENDING before opensAt', () => {
    expect(threadState(thread, new Date('2025-01-01T09:59:00Z'))).toBe('PENDING');
  });
  it('is OPEN inside the window', () => {
    expect(threadState(thread, new Date('2025-01-02T00:00:00Z'))).toBe('OPEN');
  });
  it('is CLOSED after closesAt', () => {
    expect(threadState(thread, new Date('2025-01-08T10:00:01Z'))).toBe('CLOSED');
  });
});

const patient: AuthUser = { id: 'pat', role: 'PATIENT' };
const doctor: AuthUser = { id: 'doc', role: 'DOCTOR' };
const stranger: AuthUser = { id: 'x', role: 'PATIENT' };

function makeService(threadWindow: { opensAt: Date; closesAt: Date }) {
  const thread = { id: 'th1', appointmentId: 'ap1', ...threadWindow };
  const appt = { id: 'ap1', patientId: patient.id, doctorId: doctor.id };
  const enqueueMany = vi.fn().mockResolvedValue(undefined);
  const insertReturning = vi.fn().mockResolvedValue([
    {
      id: 'm1',
      threadId: 'th1',
      senderId: patient.id,
      body: 'hello',
      attachmentKey: null,
      sentAt: new Date('2025-01-02T00:00:00Z'),
      readAt: null,
    },
  ]);
  const db = {
    query: {
      chatThreads: { findFirst: vi.fn().mockResolvedValue(thread) },
      appointments: { findFirst: vi.fn().mockResolvedValue(appt) },
      users: { findFirst: vi.fn().mockResolvedValue({ fullName: 'Dr Test' }) },
    },
    insert: () => ({ values: () => ({ returning: insertReturning }) }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new ChatService(db as any, { enqueueMany } as any);
  return { service, enqueueMany, insertReturning };
}

const openWindow = {
  opensAt: new Date(Date.now() - HOUR),
  closesAt: new Date(Date.now() + HOUR),
};

describe('ChatService.send', () => {
  it('writes a message and notifies the other party when the window is open', async () => {
    const { service, enqueueMany, insertReturning } = makeService(openWindow);
    const msg = await service.send(patient, { threadId: 'th1', body: 'hello' });
    expect(msg.id).toBe('m1');
    expect(insertReturning).toHaveBeenCalledOnce();
    expect(enqueueMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: doctor.id, kind: 'chat_message', channel: 'PUSH' }),
    ]);
  });

  it('rejects a send before the window opens', async () => {
    const { service } = makeService({
      opensAt: new Date(Date.now() + HOUR),
      closesAt: new Date(Date.now() + 2 * HOUR),
    });
    await expect(service.send(doctor, { threadId: 'th1', body: 'hi' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a send after the window closes', async () => {
    const { service } = makeService({
      opensAt: new Date(Date.now() - 2 * HOUR),
      closesAt: new Date(Date.now() - HOUR),
    });
    await expect(service.send(doctor, { threadId: 'th1', body: 'hi' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('forbids a non-participant', async () => {
    const { service } = makeService(openWindow);
    await expect(service.send(stranger, { threadId: 'th1', body: 'hi' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

import { describe, expect, it } from 'vitest';
import { renderPrescriptionPdf, type PrescriptionPdfData } from './prescription-pdf';

const base: PrescriptionPdfData = {
  issuedAt: new Date('2026-02-01T09:30:00Z'),
  doctorName: 'Dr. Asha Rao',
  doctorQualifications: 'MBBS, MD (General Medicine)',
  medicalCouncil: 'Tamil Nadu Medical Council',
  registrationNumber: 'TNMC-12345',
  patientName: 'Ravi Kumar',
  scheduledStart: new Date('2026-02-01T09:00:00Z'),
  symptoms: 'Dry cough for 4 days, mild fever.',
  diagnosis: 'Acute viral upper respiratory infection',
  advice: 'Rest, fluids, steam inhalation. Return if breathing difficulty.',
  notes: null,
  followUpDate: '2026-02-06',
  drugCategoryFlags: ['SCHEDULE_H'],
  items: [
    {
      drugName: 'Paracetamol',
      strength: '500 mg',
      form: 'tablet',
      frequency: '1 tab twice daily',
      durationDays: 5,
      instructions: 'after food',
    },
  ],
};

describe('renderPrescriptionPdf', () => {
  it('produces a non-empty PDF buffer', async () => {
    const buf = await renderPrescriptionPdf(base);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('renders with only the required fields', async () => {
    const buf = await renderPrescriptionPdf({
      ...base,
      symptoms: null,
      advice: null,
      notes: null,
      followUpDate: null,
      drugCategoryFlags: [],
    });
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('handles many items without throwing', async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      drugName: `Drug ${i + 1}`,
      frequency: 'once daily',
      durationDays: 3,
    }));
    const buf = await renderPrescriptionPdf({ ...base, items });
    expect(buf.length).toBeGreaterThan(500);
  });
});

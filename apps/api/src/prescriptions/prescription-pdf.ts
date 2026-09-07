import PDFDocument from 'pdfkit';

export interface PrescriptionPdfData {
  issuedAt: Date;
  doctorName: string;
  doctorQualifications: string;
  medicalCouncil: string;
  registrationNumber: string;
  patientName: string;
  scheduledStart: Date;
  symptoms?: string | null;
  diagnosis: string;
  advice?: string | null;
  notes?: string | null;
  followUpDate?: string | null;
  drugCategoryFlags: string[];
  items: Array<{
    drugName: string;
    strength?: string | null;
    form?: string | null;
    frequency: string;
    durationDays: number;
    instructions?: string | null;
  }>;
}

const IST = 'en-IN';
const fmtDateTime = (d: Date): string =>
  d.toLocaleString(IST, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
const fmtDate = (d: Date): string =>
  d.toLocaleDateString(IST, { dateStyle: 'medium', timeZone: 'Asia/Kolkata' });

/** Renders a prescription to a PDF buffer with pdfkit's built-in Helvetica
 *  (no font files — safe on serverless). Deterministic given its input. */
export function renderPrescriptionPdf(data: PrescriptionPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: 'Prescription' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const line = (): void => {
      doc.moveDown(0.4);
      doc
        .strokeColor('#d4d4d4')
        .lineWidth(1)
        .moveTo(doc.x, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .stroke();
      doc.moveDown(0.6);
    };
    const heading = (text: string): void => {
      doc.moveDown(0.6).fillColor('#111111').fontSize(11).font('Helvetica-Bold').text(text.toUpperCase());
      doc.moveDown(0.2).fillColor('#222222').fontSize(10).font('Helvetica');
    };

    // Header — prescriber identity (Telemedicine Practice Guidelines 2020).
    doc.fillColor('#111111').fontSize(16).font('Helvetica-Bold').text(data.doctorName);
    doc.fillColor('#444444').fontSize(10).font('Helvetica').text(data.doctorQualifications);
    doc.text(`${data.medicalCouncil} · Reg. No. ${data.registrationNumber}`);
    doc
      .moveUp(2)
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#2563eb')
      .text('CareLink', { align: 'right' });
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Teleconsultation', { align: 'right' });
    doc.fillColor('#222222');
    line();

    // Patient + consultation meta.
    doc.fontSize(10).font('Helvetica');
    doc.font('Helvetica-Bold').text('Patient: ', { continued: true }).font('Helvetica').text(data.patientName);
    doc
      .font('Helvetica-Bold')
      .text('Consultation: ', { continued: true })
      .font('Helvetica')
      .text(fmtDateTime(data.scheduledStart));
    doc
      .font('Helvetica-Bold')
      .text('Issued: ', { continued: true })
      .font('Helvetica')
      .text(fmtDateTime(data.issuedAt));

    if (data.symptoms) {
      heading('Symptoms');
      doc.text(data.symptoms);
    }

    heading('Diagnosis');
    doc.text(data.diagnosis);

    heading('Rx');
    data.items.forEach((it, i) => {
      const name = [it.drugName, it.strength, it.form].filter(Boolean).join(' ');
      doc.font('Helvetica-Bold').text(`${i + 1}. ${name}`);
      doc
        .font('Helvetica')
        .fillColor('#444444')
        .text(`   ${it.frequency} · ${it.durationDays} day${it.durationDays === 1 ? '' : 's'}${it.instructions ? ` · ${it.instructions}` : ''}`);
      doc.fillColor('#222222').moveDown(0.2);
    });

    if (data.advice) {
      heading('Advice');
      doc.text(data.advice);
    }
    if (data.notes) {
      heading('Notes');
      doc.text(data.notes);
    }
    if (data.followUpDate) {
      heading('Follow-up');
      doc.text(fmtDate(new Date(`${data.followUpDate}T00:00:00Z`)));
    }
    if (data.drugCategoryFlags.length > 0) {
      heading('Drug categories');
      doc.text(data.drugCategoryFlags.join(', '));
    }

    line();
    doc
      .fontSize(8)
      .fillColor('#888888')
      .font('Helvetica')
      .text(
        'Issued via a CareLink teleconsultation under the Telemedicine Practice Guidelines 2020. ' +
          'The prescribing doctor is responsible for the drugs listed and their permissibility for teleconsultation.',
      );

    doc.end();
  });
}

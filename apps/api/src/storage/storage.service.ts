import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { AppConfig } from '../config';

/**
 * Thin wrapper over Cloudinary for private file storage (prescription PDFs now;
 * chat attachments + medical documents later). All uploads are `type:
 * 'authenticated'` / `resource_type: 'raw'` — never publicly reachable. The
 * browser never talks to Cloudinary directly; the API fetches bytes back with a
 * short-lived signed URL and streams them.
 *
 * If CLOUDINARY_URL is unset, `configured` is false and callers fall back to
 * rendering on demand (nothing is persisted).
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private cfgConfigured = false;
  private folder = 'carelink';
  private ttl = 300;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  onModuleInit(): void {
    this.folder = this.config.get('CLOUDINARY_FOLDER', { infer: true });
    this.ttl = this.config.get('FILE_URL_TTL_SECONDS', { infer: true });
    this.cfgConfigured = Boolean(this.config.get('CLOUDINARY_URL', { infer: true }));
    if (!this.cfgConfigured) {
      this.logger.warn('CLOUDINARY_URL not set — prescription PDFs will be rendered on demand, not stored.');
      return;
    }
    // The SDK reads CLOUDINARY_URL from the environment; force HTTPS delivery.
    cloudinary.config({ secure: true });
  }

  get configured(): boolean {
    return this.cfgConfigured;
  }

  private prescriptionPublicId(prescriptionId: string): string {
    return `${this.folder}/prescriptions/${prescriptionId}`;
  }

  /** Uploads (or overwrites) a prescription PDF. Returns the Cloudinary public_id. */
  async uploadPrescriptionPdf(prescriptionId: string, pdf: Buffer): Promise<string> {
    const publicId = this.prescriptionPublicId(prescriptionId);
    await new Promise<void>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: 'raw',
          type: 'authenticated',
          format: 'pdf',
          overwrite: true,
          invalidate: true,
        },
        (err) => (err ? reject(err) : resolve()),
      );
      stream.end(pdf);
    });
    return publicId;
  }

  /** Fetches a stored PDF back as bytes via a short-lived signed URL. */
  async fetchPdf(publicId: string): Promise<Buffer | null> {
    if (!this.cfgConfigured) return null;
    const url = cloudinary.utils.private_download_url(publicId, 'pdf', {
      resource_type: 'raw',
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + this.ttl,
    });
    const res = await fetch(url);
    if (!res.ok) {
      this.logger.warn(`fetchPdf ${publicId} → ${res.status}`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  }
}

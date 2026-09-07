import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { AppConfig } from '../config';

/** Pulls cloud_name / api_key / api_secret out of a `cloudinary://key:secret@cloud` URL. */
function parseCloudinaryUrl(
  url: string,
): { cloud_name: string; api_key: string; api_secret: string } | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'cloudinary:' || !u.hostname || !u.username || !u.password) return null;
    return {
      cloud_name: u.hostname,
      api_key: decodeURIComponent(u.username),
      api_secret: decodeURIComponent(u.password),
    };
  } catch {
    return null;
  }
}

/**
 * Thin wrapper over Cloudinary for private file storage (prescription PDFs now;
 * chat attachments + medical documents later). All uploads are `type:
 * 'authenticated'` / `resource_type: 'raw'` — never publicly reachable. The
 * browser never talks to Cloudinary directly; the API fetches bytes back with a
 * short-lived signed URL and streams them.
 *
 * If Cloudinary is unconfigured (no CLOUDINARY_URL, and no CLOUDINARY_CLOUD_NAME
 * / _API_KEY / _API_SECRET trio for loadConfig to assemble one from), `configured`
 * is false and callers fall back to rendering on demand (nothing is persisted).
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

    const url = this.config.get('CLOUDINARY_URL', { infer: true });
    const creds = url ? parseCloudinaryUrl(url) : null;
    this.cfgConfigured = creds !== null;
    if (!creds) {
      this.logger.warn(
        'Cloudinary not configured (set CLOUDINARY_URL, or CLOUDINARY_CLOUD_NAME/_API_KEY/_API_SECRET) — prescription PDFs will be rendered on demand, not stored.',
      );
      return;
    }
    // Configure the SDK explicitly rather than relying on it reading
    // CLOUDINARY_URL off process.env (which may be an empty string from a copied
    // .env). Force HTTPS delivery.
    cloudinary.config({ ...creds, secure: true });
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

  /**
   * Fetches a stored PDF back as bytes via a short-lived signed URL. Returns
   * null on any failure (not configured, bad credentials, network, 4xx/5xx) so
   * the caller can fall back to rendering the PDF on demand.
   */
  async fetchPdf(publicId: string): Promise<Buffer | null> {
    if (!this.cfgConfigured) return null;
    try {
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
    } catch (err) {
      this.logger.warn(`fetchPdf ${publicId} failed: ${(err as Error).message}`);
      return null;
    }
  }
}

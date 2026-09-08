import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  NotImplementedException,
  Patch,
  PayloadTooLargeException,
  Put,
  StreamableFile,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  deleteAccountSchema,
  doctorProfileSchema,
  patientProfileSchema,
  updateAccountSchema,
  type AvatarResult,
  type DeleteAccountInput,
  type DoctorProfileInput,
  type DoctorProfileOut,
  type Me,
  type PatientProfileInput,
  type PatientProfileOut,
  type UpdateAccountInput,
} from '@carelink/shared';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { StorageService } from '../storage/storage.service';
import { UsersService } from './users.service';

/** Just the bits of a multer file we touch — avoids depending on @types/multer. */
interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
// Hard cap fed to multer purely to bound memory; the real limit is enforced in
// the handler with a clean 413. A body past this rare ceiling is a 500 — fine
// for what is only an abuse backstop.
const AVATAR_UPLOAD_CEILING = 6 * 1024 * 1024;
const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly storage: StorageService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<Me> {
    return this.users.getMe(user.id);
  }

  /** DPDP right to access — the patient's full record as a downloadable JSON file. */
  @Get('me/export')
  @Roles('PATIENT')
  @Header('Content-Type', 'application/json; charset=utf-8')
  async exportData(@CurrentUser() user: AuthUser): Promise<StreamableFile> {
    const bundle = await this.users.exportPatientData(user.id);
    const json = Buffer.from(JSON.stringify(bundle, null, 2), 'utf-8');
    return new StreamableFile(json, {
      type: 'application/json',
      disposition: `attachment; filename="carelink-export-${bundle.exportedAt.slice(0, 10)}.json"`,
    });
  }

  /** Upload / replace the current user's profile picture. Multipart field `file`. */
  @Put('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: AVATAR_UPLOAD_CEILING, files: 1 } }),
  )
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<AvatarResult> {
    if (!this.storage.configured) {
      throw new NotImplementedException('image storage is not configured');
    }
    if (!file) throw new BadRequestException('no image uploaded');
    if (file.size > AVATAR_MAX_BYTES) {
      throw new PayloadTooLargeException('image must be 2 MB or smaller');
    }
    if (!AVATAR_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('image must be a JPEG, PNG or WebP');
    }
    return this.users.setAvatar(user.id, file.buffer);
  }

  @Delete('me/avatar')
  @HttpCode(200)
  deleteAvatar(@CurrentUser() user: AuthUser): Promise<AvatarResult> {
    return this.users.clearAvatar(user.id);
  }

  /** Edit the account's own display name / phone. */
  @Patch('me')
  updateAccount(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateAccountSchema)) body: UpdateAccountInput,
  ): Promise<Me> {
    return this.users.updateAccount(user.id, body);
  }

  @Put('me/patient-profile')
  upsertPatientProfile(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(patientProfileSchema)) body: PatientProfileInput,
  ): Promise<PatientProfileOut> {
    return this.users.upsertPatientProfile(user.id, body);
  }

  @Put('me/doctor-profile')
  @Roles('DOCTOR')
  upsertDoctorProfile(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(doctorProfileSchema)) body: DoctorProfileInput,
  ): Promise<DoctorProfileOut> {
    return this.users.upsertDoctorProfile(user.id, body);
  }

  /** DPDP erasure. PATIENT only — doctor removal is a manual ops task. */
  @Delete('me')
  @Roles('PATIENT')
  @HttpCode(200)
  deleteAccount(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(deleteAccountSchema)) body: DeleteAccountInput,
  ): Promise<{ ok: true }> {
    return this.users.deleteAccount(user.id, body.password);
  }
}

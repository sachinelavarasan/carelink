import { Module } from '@nestjs/common';
import { PrescriptionTemplatesService } from './prescription-templates.service';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';

@Module({
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PrescriptionTemplatesService],
})
export class PrescriptionsModule {}

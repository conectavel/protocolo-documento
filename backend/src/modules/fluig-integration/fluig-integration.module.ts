import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Devolutiva } from '../devolutivas/entities/devolutiva.entity';
import { FluigIntegrationService } from './fluig-integration.service';
import { FluigIntegrationController } from './fluig-integration.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Devolutiva])],
  controllers: [FluigIntegrationController],
  providers: [FluigIntegrationService],
  exports: [FluigIntegrationService],
})
export class FluigIntegrationModule {}

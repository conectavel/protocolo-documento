import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { Parceiro } from '../parceiros/entities/parceiro.entity';
import { Presidente } from '../parceiros/entities/presidente.entity';
import { Mobilizador } from '../parceiros/entities/mobilizador.entity';
import { CoordenadorRegional } from '../parceiros/entities/coordenador-regional.entity';
import { SincronizacaoRm } from './entities/sincronizacao-rm.entity';
import { RmMiddlewareClient } from './rm-middleware.client';
import { RmMiddlewareMockClient } from './rm-middleware-mock.client';
import { RmMiddlewareHttpClient } from './rm-middleware-http.client';
import { RmIntegrationService } from './rm-integration.service';
import { RmIntegrationController } from './rm-integration.controller';
import { SincronizarRmJob } from './jobs/sincronizar-rm.job';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([Parceiro, Presidente, Mobilizador, CoordenadorRegional, SincronizacaoRm]),
  ],
  controllers: [RmIntegrationController],
  providers: [
    {
      provide: RmMiddlewareClient,
      useFactory: (config: ConfigService, mock: RmMiddlewareMockClient, http: RmMiddlewareHttpClient) =>
        config.get<string>('RM_MIDDLEWARE_MODE', 'mock') === 'http' ? http : mock,
      inject: [ConfigService, RmMiddlewareMockClient, RmMiddlewareHttpClient],
    },
    RmMiddlewareMockClient,
    RmMiddlewareHttpClient,
    RmIntegrationService,
    SincronizarRmJob,
  ],
  exports: [RmIntegrationService],
})
export class RmIntegrationModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { buildDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { ParceirosModule } from './modules/parceiros/parceiros.module';
import { RmIntegrationModule } from './modules/rm-integration/rm-integration.module';
import { FluigIntegrationModule } from './modules/fluig-integration/fluig-integration.module';
import { SolicitacoesModule } from './modules/solicitacoes/solicitacoes.module';
import { AnexosModule } from './modules/anexos/anexos.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildDatabaseConfig,
    }),
    AuthModule,
    ParceirosModule,
    RmIntegrationModule,
    FluigIntegrationModule,
    AnexosModule,
    SolicitacoesModule,
    UsuariosModule,
  ],
})
export class AppModule {}

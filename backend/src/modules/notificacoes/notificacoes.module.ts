import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { PreferenciaNotificacao } from '../usuarios/entities/preferencia-notificacao.entity';
import { Mobilizador } from '../parceiros/entities/mobilizador.entity';
import { Presidente } from '../parceiros/entities/presidente.entity';
import { Parceiro } from '../parceiros/entities/parceiro.entity';
import { CoordenadorRegional } from '../parceiros/entities/coordenador-regional.entity';
import { AreaPrograma } from '../parceiros/entities/area-programa.entity';
import { MailerService } from './mailer.service';
import { NotificacoesService } from './notificacoes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      PreferenciaNotificacao,
      Mobilizador,
      Presidente,
      Parceiro,
      CoordenadorRegional,
      AreaPrograma,
    ]),
  ],
  providers: [MailerService, NotificacoesService],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}

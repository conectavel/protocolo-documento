import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Solicitacao } from './entities/solicitacao.entity';
import { ItemSolicitacao } from './entities/item-solicitacao.entity';
import { Tramitacao } from './entities/tramitacao.entity';
import { Devolutiva } from '../devolutivas/entities/devolutiva.entity';
import { AreaPrograma } from '../parceiros/entities/area-programa.entity';
import { Parceiro } from '../parceiros/entities/parceiro.entity';
import { Mobilizador } from '../parceiros/entities/mobilizador.entity';
import { AnexosModule } from '../anexos/anexos.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { SolicitacoesService } from './solicitacoes.service';
import { SolicitacoesController } from './solicitacoes.controller';
import { SolicitacaoStateMachineService } from './solicitacao-state-machine.service';
import { VerificarCienciaRegionalJob } from './jobs/verificar-ciencia-regional.job';

@Module({
  imports: [
    TypeOrmModule.forFeature([Solicitacao, ItemSolicitacao, Tramitacao, Devolutiva, AreaPrograma, Parceiro, Mobilizador]),
    AnexosModule,
    NotificacoesModule,
  ],
  controllers: [SolicitacoesController],
  providers: [SolicitacoesService, SolicitacaoStateMachineService, VerificarCienciaRegionalJob],
  exports: [SolicitacoesService, SolicitacaoStateMachineService],
})
export class SolicitacoesModule {}

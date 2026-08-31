import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Solicitacao } from '../entities/solicitacao.entity';
import { StatusMacro } from '../../../common/enums/solicitacao.enum';
import { SolicitacaoStateMachineService } from '../solicitacao-state-machine.service';

/**
 * HU02 — SLA de 24h para o Coordenador Regional dar ciência. Sem ciência manual dentro do
 * prazo, a solicitação avança automaticamente para a Assessoria do Superintendente.
 */
@Injectable()
export class VerificarCienciaRegionalJob {
  private readonly logger = new Logger(VerificarCienciaRegionalJob.name);

  constructor(
    @InjectRepository(Solicitacao) private readonly solicitacaoRepo: Repository<Solicitacao>,
    private readonly stateMachine: SolicitacaoStateMachineService,
  ) {}

  @Cron('*/15 * * * *')
  async executar(): Promise<void> {
    const vencidas = await this.solicitacaoRepo.find({
      where: {
        statusMacro: StatusMacro.EM_ANALISE_REGIONAL,
        prazoCienciaRegional: LessThan(new Date()),
      },
      relations: ['itens'],
    });

    if (vencidas.length === 0) return;

    this.logger.log(`${vencidas.length} solicitação(ões) com prazo de ciência regional expirado.`);
    for (const solicitacao of vencidas) {
      await this.stateMachine.darCiencia(solicitacao, null, true);
    }
  }
}

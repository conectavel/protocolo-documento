import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Devolutiva } from '../devolutivas/entities/devolutiva.entity';

export interface EventoFluig {
  itemSolicitacaoId: string;
  numeroEventoTurma?: string;
  numeroProcessoAceiteFluig?: string;
  status: 'CONFIRMADO' | 'CANCELADO';
  timestamp: string;
}

/**
 * Integração com o Fluig para o registro/confirmação do agendamento do evento aprovado.
 * O Coordenador da Ação/Programa registra os dados iniciais (ver DevolutivasService);
 * este serviço trata a confirmação assíncrona vinda do Fluig (fluxograma: "após agendamento,
 * devolução automática").
 */
@Injectable()
export class FluigIntegrationService {
  private readonly logger = new Logger(FluigIntegrationService.name);

  constructor(@InjectRepository(Devolutiva) private readonly devolutivaRepo: Repository<Devolutiva>) {}

  async processarEvento(evento: EventoFluig): Promise<void> {
    const devolutiva = await this.devolutivaRepo.findOne({
      where: { itemSolicitacaoId: evento.itemSolicitacaoId },
    });

    if (!devolutiva) {
      this.logger.warn(
        `Evento do Fluig recebido para item ${evento.itemSolicitacaoId} sem devolutiva registrada ainda — ignorado.`,
      );
      return;
    }

    devolutiva.numeroEventoTurma = evento.numeroEventoTurma ?? devolutiva.numeroEventoTurma;
    devolutiva.numeroProcessoAceiteFluig =
      evento.numeroProcessoAceiteFluig ?? devolutiva.numeroProcessoAceiteFluig;

    await this.devolutivaRepo.save(devolutiva);
    this.logger.log(
      `Devolutiva do item ${evento.itemSolicitacaoId} atualizada com referências do Fluig (status ${evento.status}).`,
    );
  }
}

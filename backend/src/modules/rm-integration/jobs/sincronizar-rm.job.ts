import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { RmIntegrationService } from '../rm-integration.service';

/**
 * Fallback do webhook: garante consistência mesmo se um evento em tempo real falhar/for perdido.
 * Intervalo configurável via RM_SYNC_INTERVAL_MINUTES (default 10 min).
 */
@Injectable()
export class SincronizarRmJob {
  private readonly logger = new Logger(SincronizarRmJob.name);
  private ultimaExecucao: Date | undefined;

  constructor(
    private readonly rmIntegrationService: RmIntegrationService,
    private readonly config: ConfigService,
  ) {}

  @Cron('*/10 * * * *')
  async executar(): Promise<void> {
    const intervaloMin = Number(this.config.get('RM_SYNC_INTERVAL_MINUTES', '10'));
    this.logger.log(`Sincronização periódica com o RM Middleware (janela: ${intervaloMin} min)`);
    try {
      await this.rmIntegrationService.sincronizarTudo(this.ultimaExecucao);
      this.ultimaExecucao = new Date();
    } catch (erro) {
      this.logger.error('Falha na sincronização periódica com o RM Middleware', erro);
    }
  }
}

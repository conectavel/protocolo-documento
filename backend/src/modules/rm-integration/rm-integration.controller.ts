import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EventoWebhookRm, RmIntegrationService } from './rm-integration.service';

/**
 * Recebe eventos em tempo real do RM Middleware quando Parceiro/Presidente/Mobilizador/
 * Coordenador Regional são criados, atualizados ou inativados no RM/ACORP.
 * Autenticação: HMAC-SHA256 do corpo da requisição, comparado ao header X-RM-Signature.
 */
@Controller('integracoes/rm')
export class RmIntegrationController {
  constructor(
    private readonly rmIntegrationService: RmIntegrationService,
    private readonly config: ConfigService,
  ) {}

  @Post('eventos')
  async receberEvento(
    @Body() evento: EventoWebhookRm,
    @Headers('x-rm-signature') assinatura: string,
  ): Promise<{ recebido: boolean }> {
    this.validarAssinatura(evento, assinatura);
    await this.rmIntegrationService.processarEventoWebhook(evento);
    return { recebido: true };
  }

  private validarAssinatura(evento: EventoWebhookRm, assinatura: string): void {
    const segredo = this.config.get<string>('RM_MIDDLEWARE_WEBHOOK_SECRET');
    if (!segredo) return; // segredo não configurado (ambiente de desenvolvimento)

    const esperada = crypto.createHmac('sha256', segredo).update(JSON.stringify(evento)).digest('hex');
    if (assinatura !== esperada) {
      throw new BadRequestException('Assinatura do webhook inválida.');
    }
  }
}

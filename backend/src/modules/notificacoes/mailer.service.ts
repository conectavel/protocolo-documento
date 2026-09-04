import { Injectable, Logger } from '@nestjs/common';

/**
 * Envio de e-mail — hoje simulado (só registra em log), sem provedor SMTP
 * configurado ainda. Para ativar o envio real, trocar o corpo de `enviar`
 * por um transporte de verdade (ex.: nodemailer) usando as credenciais
 * definidas em EMAIL_SMTP_* no .env; o restante do sistema (NotificacoesService,
 * preferências por usuário) já funciona sem nenhuma outra mudança.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly remetente = process.env.EMAIL_REMETENTE || 'info@senar-go.com.br';

  async enviar(destinatario: string, assunto: string, corpo: string): Promise<void> {
    this.logger.log(
      `[E-MAIL SIMULADO] De: ${this.remetente} · Para: ${destinatario} · Assunto: ${assunto}\n${corpo}`,
    );
  }
}

import { Body, Controller, Post } from '@nestjs/common';
import { EventoFluig, FluigIntegrationService } from './fluig-integration.service';

@Controller('integracoes/fluig')
export class FluigIntegrationController {
  constructor(private readonly fluigIntegrationService: FluigIntegrationService) {}

  @Post('eventos')
  async receberEvento(@Body() evento: EventoFluig): Promise<{ recebido: boolean }> {
    await this.fluigIntegrationService.processarEvento(evento);
    return { recebido: true };
  }
}

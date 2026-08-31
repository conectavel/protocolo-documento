import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, UsuarioAutenticado } from '../../common/guards/jwt-auth.guard';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { PreferenciasNotificacaoService } from './preferencias-notificacao.service';
import { AtualizarPreferenciasDto } from './dto/atualizar-preferencias.dto';

@Controller('usuarios/me')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly preferenciasService: PreferenciasNotificacaoService) {}

  @Get('preferencias-notificacao')
  buscarPreferencias(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.preferenciasService.buscarMinhas(usuario.id, usuario.papel);
  }

  @Put('preferencias-notificacao')
  atualizarPreferencias(
    @Body() dto: AtualizarPreferenciasDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.preferenciasService.atualizar(usuario.id, usuario.papel, dto);
  }
}

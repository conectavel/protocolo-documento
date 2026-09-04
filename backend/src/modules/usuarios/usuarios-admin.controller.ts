import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Papel } from '../../common/enums/papel.enum';
import { UsuariosAdminService } from './usuarios-admin.service';
import {
  AlterarPapelUsuarioDto,
  AtualizarAreasUsuarioDto,
  AtualizarDepartamentoUsuarioDto,
  AtualizarStatusUsuarioDto,
  TransferirProcessosDto,
} from './dto/gerenciar-usuario.dto';

/** Tela "Gerenciar Usuários" — exclusiva do Administrador. */
@Controller('usuarios/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Papel.ADMIN)
export class UsuariosAdminController {
  constructor(private readonly usuariosAdminService: UsuariosAdminService) {}

  @Get()
  listar() {
    return this.usuariosAdminService.listar();
  }

  @Get(':id/contexto')
  buscarContexto(@Param('id') id: string) {
    return this.usuariosAdminService.buscarContexto(id);
  }

  @Put(':id/status')
  atualizarStatus(@Param('id') id: string, @Body() dto: AtualizarStatusUsuarioDto) {
    return this.usuariosAdminService.atualizarStatus(id, dto.ativo);
  }

  @Put(':id/papel')
  alterarPapel(@Param('id') id: string, @Body() dto: AlterarPapelUsuarioDto) {
    return this.usuariosAdminService.alterarPapel(id, dto.papel);
  }

  @Put(':id/areas')
  atualizarAreas(@Param('id') id: string, @Body() dto: AtualizarAreasUsuarioDto) {
    return this.usuariosAdminService.atualizarAreas(id, dto.areasProgramaIds);
  }

  @Put(':id/departamento')
  atualizarDepartamento(@Param('id') id: string, @Body() dto: AtualizarDepartamentoUsuarioDto) {
    return this.usuariosAdminService.atualizarDepartamento(id, dto.departamento);
  }

  @Put(':id/transferir-processos')
  transferirProcessos(@Param('id') id: string, @Body() dto: TransferirProcessosDto) {
    return this.usuariosAdminService.transferirProcessos(id, dto.paraUsuarioId);
  }
}

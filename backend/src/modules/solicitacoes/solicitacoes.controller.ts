import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, UsuarioAutenticado } from '../../common/guards/jwt-auth.guard';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { SolicitacoesService } from './solicitacoes.service';
import { CriarSolicitacaoDto } from './dto/criar-solicitacao.dto';
import { ListarSolicitacoesDto } from './dto/listar-solicitacoes.dto';
import { MetricasSolicitacoesDto } from './dto/metricas.dto';
import {
  AnaliseAssessoriaDto,
  DesignarCoordenadorDto,
  DespachoSuperintendenteDto,
  DirecionamentoDiretorDto,
  EncaminharItemDto,
  RegistrarDevolutivaDto,
} from './dto/transicoes.dto';

@Controller('solicitacoes')
@UseGuards(JwtAuthGuard)
export class SolicitacoesController {
  constructor(private readonly solicitacoesService: SolicitacoesService) {}

  @Post()
  criar(@Body() dto: CriarSolicitacaoDto, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.solicitacoesService.criar(dto, usuario);
  }

  @Get()
  listar(@Query() filtros: ListarSolicitacoesDto, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.solicitacoesService.listar(usuario, filtros);
  }

  @Get('metricas')
  metricas(@Query() filtros: MetricasSolicitacoesDto, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.solicitacoesService.metricas(usuario, filtros);
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.solicitacoesService.buscarPorId(id, usuario);
  }

  @Get(':id/historico')
  historico(@Param('id') id: string, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.solicitacoesService.historico(id, usuario);
  }

  @Post(':id/ciencia')
  darCiencia(@Param('id') id: string, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.solicitacoesService.darCiencia(id, usuario);
  }

  @Post(':id/analise-assessoria')
  analisarAssessoria(
    @Param('id') id: string,
    @Body() dto: AnaliseAssessoriaDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.solicitacoesService.analisarAssessoria(id, usuario, dto);
  }

  @Post(':id/reenviar-ajuste')
  reenviarAposAjuste(@Param('id') id: string, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.solicitacoesService.reenviarAposAjuste(id, usuario);
  }

  @Post(':id/despacho-superintendente')
  despacharSuperintendente(
    @Param('id') id: string,
    @Body() dto: DespachoSuperintendenteDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.solicitacoesService.despacharSuperintendente(id, usuario, dto);
  }

  @Post(':id/direcionamento-diretor')
  direcionarDiretor(
    @Param('id') id: string,
    @Body() dto: DirecionamentoDiretorDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.solicitacoesService.direcionarDiretor(id, usuario, dto);
  }

  @Post('itens/:itemId/designar-coordenador')
  designarCoordenador(
    @Param('itemId') itemId: string,
    @Body() dto: DesignarCoordenadorDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.solicitacoesService.designarCoordenador(itemId, usuario, dto);
  }

  @Post('itens/:itemId/aceitar')
  aceitarItem(@Param('itemId') itemId: string, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.solicitacoesService.aceitarItem(itemId, usuario);
  }

  @Post('itens/:itemId/encaminhar')
  encaminharItem(
    @Param('itemId') itemId: string,
    @Body() dto: EncaminharItemDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.solicitacoesService.encaminharItem(itemId, usuario, dto);
  }

  @Post('itens/:itemId/devolutiva')
  registrarDevolutiva(
    @Param('itemId') itemId: string,
    @Body() dto: RegistrarDevolutivaDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.solicitacoesService.registrarDevolutiva(itemId, usuario, dto);
  }
}

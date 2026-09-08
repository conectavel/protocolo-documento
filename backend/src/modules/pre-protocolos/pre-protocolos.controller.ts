import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard, UsuarioAutenticado } from '../../common/guards/jwt-auth.guard';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { PreProtocolosService } from './pre-protocolos.service';
import { IngerirPreProtocoloDto } from './dto/ingerir-pre-protocolo.dto';
import { ListarPreProtocolosDto } from './dto/listar-pre-protocolos.dto';
import { AnexarOficioPreProtocoloDto } from './dto/anexar-oficio-pre-protocolo.dto';
import { EnviarSolicitacaoPublicaDto } from './dto/enviar-solicitacao-publica.dto';
import { CriarSolicitacaoDto } from '../solicitacoes/dto/criar-solicitacao.dto';

@Controller('pre-protocolos')
export class PreProtocolosController {
  constructor(
    private readonly preProtocolosService: PreProtocolosService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Endpoint de ingestão para o conector de e-mail (IMAP/Microsoft Graph — a implementar
   * pelo time de TI, ver integracao-rm-fluig.md). Autenticado por segredo compartilhado,
   * não por JWT, já que quem chama é um serviço, não um usuário logado no navegador.
   */
  @Post('ingestao')
  async ingerir(
    @Body() dto: IngerirPreProtocoloDto,
    @Headers('x-pre-protocolo-secret') segredoRecebido: string,
  ) {
    const segredoConfigurado = this.config.get<string>('PRE_PROTOCOLO_INGESTAO_SECRET');
    if (segredoConfigurado && segredoRecebido !== segredoConfigurado) {
      throw new ForbiddenException('Segredo de ingestão inválido.');
    }
    return this.preProtocolosService.ingerir(dto);
  }

  /**
   * Formulário público de envio anônimo (sem login) — qualquer pessoa pode
   * mandar uma solicitação por aqui. Limitado a 5 envios por minuto por IP
   * (ThrottlerGuard) para conter abuso, já que não há autenticação nenhuma.
   */
  @Post('publico')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('anexo'))
  receberPublico(
    @Body() dto: EnviarSolicitacaoPublicaDto,
    @UploadedFile() arquivo?: Express.Multer.File,
  ) {
    return this.preProtocolosService.receberSolicitacaoPublica(dto, arquivo);
  }

  /**
   * Usado pelo formulário público ao digitar o CPF: tenta reconhecer a pessoa a partir
   * de um envio anterior e devolve seus dados para pré-preencher o formulário. Mesmo
   * rate-limit do envio público, já que também não exige login.
   */
  @Get('publico/buscar-cpf')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  buscarPorCpf(@Query('cpf') cpf: string) {
    return this.preProtocolosService.buscarDadosPorCpf(cpf ?? '');
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  listar(@Query() filtros: ListarPreProtocolosDto, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.preProtocolosService.listar(usuario, filtros);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  buscarPorId(@Param('id') id: string, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.preProtocolosService.buscarPorId(id, usuario);
  }

  @Post(':id/converter')
  @UseGuards(JwtAuthGuard)
  converter(
    @Param('id') id: string,
    @Body() dto: CriarSolicitacaoDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.preProtocolosService.converter(id, dto, usuario);
  }

  @Post(':id/anexo')
  @UseGuards(JwtAuthGuard)
  anexarOficio(
    @Param('id') id: string,
    @Body() dto: AnexarOficioPreProtocoloDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.preProtocolosService.anexarOficio(id, dto, usuario);
  }

  @Post(':id/descartar')
  @UseGuards(JwtAuthGuard)
  descartar(
    @Param('id') id: string,
    @Body('motivo') motivo: string | undefined,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    if (motivo !== undefined && typeof motivo !== 'string') {
      throw new BadRequestException('Motivo inválido.');
    }
    return this.preProtocolosService.descartar(id, motivo, usuario);
  }
}

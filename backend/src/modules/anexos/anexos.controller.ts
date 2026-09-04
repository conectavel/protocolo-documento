import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as fs from 'fs';
import { JwtAuthGuard, UsuarioAutenticado } from '../../common/guards/jwt-auth.guard';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { AnexosService } from './anexos.service';
import { GeradorOficioService } from './gerador-oficio.service';
import { GerarOficioModeloDto } from './dto/gerar-oficio-modelo.dto';
import { TipoAnexo } from './entities/anexo.entity';

@Controller('anexos')
@UseGuards(JwtAuthGuard)
export class AnexosController {
  constructor(
    private readonly anexosService: AnexosService,
    private readonly geradorOficioService: GeradorOficioService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('arquivo'))
  async upload(
    @UploadedFile() arquivo: Express.Multer.File,
    @Body('tipo') tipo: TipoAnexo = 'OUTRO',
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    if (!arquivo) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    const anexo = await this.anexosService.salvar(arquivo, tipo, usuario.id);
    return {
      id: anexo.id,
      nomeArquivo: anexo.nomeArquivo,
      tamanhoBytes: anexo.tamanhoBytes,
      mimeType: anexo.mimeType,
      url: `/api/anexos/${anexo.id}/download`,
    };
  }

  /**
   * Gera um PDF de ofício padrão a partir do que o usuário já preencheu na
   * tela (Dados do Documento + Itens) e o salva como um anexo comum — para
   * quando o Parceiro/Sindicato não tem um documento próprio pronto. Ver
   * GeradorOficioService.
   */
  @Post('gerar-modelo')
  async gerarModelo(@Body() dto: GerarOficioModeloDto, @UsuarioAtual() usuario: UsuarioAutenticado) {
    const bufferPdf = await this.geradorOficioService.gerarPdf(dto);
    const numero = dto.numeroDocumento?.replace(/[\\/]/g, '-') || 'gerado';
    const nomeArquivo = `oficio-${numero}.pdf`;

    const anexo = await this.anexosService.salvar(
      { originalname: nomeArquivo, buffer: bufferPdf, mimetype: 'application/pdf', size: bufferPdf.length },
      'OFICIO',
      usuario.id,
    );

    return {
      id: anexo.id,
      nomeArquivo: anexo.nomeArquivo,
      tamanhoBytes: anexo.tamanhoBytes,
      mimeType: anexo.mimeType,
      url: `/api/anexos/${anexo.id}/download`,
    };
  }

  @Get(':id')
  async metadados(@Param('id') id: string) {
    const anexo = await this.anexosService.buscarPorId(id);
    return {
      id: anexo.id,
      nomeArquivo: anexo.nomeArquivo,
      tamanhoBytes: anexo.tamanhoBytes,
      mimeType: anexo.mimeType,
      tipo: anexo.tipo,
    };
  }

  /**
   * `inline=1` exibe o PDF no navegador (usado pelo visualizador embutido);
   * sem o parâmetro, força o download (Content-Disposition: attachment).
   */
  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Query('inline') inline: string | undefined,
    @Res() res: Response,
  ) {
    const anexo = await this.anexosService.buscarPorId(id);
    const disposicao = inline === '1' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', anexo.mimeType);
    res.setHeader('Content-Disposition', `${disposicao}; filename="${anexo.nomeArquivo}"`);
    fs.createReadStream(anexo.caminhoStorage).pipe(res);
  }
}

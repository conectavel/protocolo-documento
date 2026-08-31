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
import { TipoAnexo } from './entities/anexo.entity';

@Controller('anexos')
@UseGuards(JwtAuthGuard)
export class AnexosController {
  constructor(private readonly anexosService: AnexosService) {}

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

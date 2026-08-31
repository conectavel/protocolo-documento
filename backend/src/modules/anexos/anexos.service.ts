import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { Anexo, TipoAnexo } from './entities/anexo.entity';

@Injectable()
export class AnexosService {
  constructor(
    @InjectRepository(Anexo) private readonly anexoRepo: Repository<Anexo>,
    private readonly config: ConfigService,
  ) {}

  async salvar(
    arquivo: { originalname: string; buffer: Buffer; mimetype: string; size: number },
    tipo: TipoAnexo,
    enviadoPor?: string,
  ): Promise<Anexo> {
    const uploadDir = this.config.get<string>('UPLOAD_DIR', './storage/anexos');
    fs.mkdirSync(uploadDir, { recursive: true });

    const nomeArmazenado = `${uuid()}-${arquivo.originalname}`;
    const caminhoCompleto = path.join(uploadDir, nomeArmazenado);
    fs.writeFileSync(caminhoCompleto, arquivo.buffer);

    const anexo = this.anexoRepo.create({
      tipo,
      nomeArquivo: arquivo.originalname,
      caminhoStorage: caminhoCompleto,
      tamanhoBytes: arquivo.size,
      mimeType: arquivo.mimetype,
      enviadoPor,
    });

    return this.anexoRepo.save(anexo);
  }

  async buscarPorId(id: string): Promise<Anexo> {
    const anexo = await this.anexoRepo.findOne({ where: { id } });
    if (!anexo) {
      throw new NotFoundException('Anexo não encontrado.');
    }
    return anexo;
  }

  async vincularSolicitacao(anexoId: string, solicitacaoId: string): Promise<void> {
    await this.anexoRepo.update({ id: anexoId }, { solicitacaoId });
  }
}

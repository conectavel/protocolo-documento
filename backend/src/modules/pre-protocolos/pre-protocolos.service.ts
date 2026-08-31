import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PreProtocolo } from './entities/pre-protocolo.entity';
import { IngerirPreProtocoloDto } from './dto/ingerir-pre-protocolo.dto';
import { AnexosService } from '../anexos/anexos.service';
import { SolicitacoesService } from '../solicitacoes/solicitacoes.service';
import { CriarSolicitacaoDto } from '../solicitacoes/dto/criar-solicitacao.dto';
import { Papel } from '../../common/enums/papel.enum';
import { UsuarioAutenticado } from '../../common/guards/jwt-auth.guard';

/**
 * "Pré Protocolo" — solicitações chegadas por e-mail (superintendencia@senar-go.com.br)
 * antes de virarem um Protocolo de Ofício formal. Acesso de revisão/conversão restrito
 * ao papel Assessor (e Admin), conforme definido pelo cliente.
 */
@Injectable()
export class PreProtocolosService {
  constructor(
    @InjectRepository(PreProtocolo) private readonly repo: Repository<PreProtocolo>,
    private readonly anexosService: AnexosService,
    private readonly solicitacoesService: SolicitacoesService,
  ) {}

  /** Chamado pelo conector de e-mail (IMAP/Microsoft Graph) — autenticado por segredo compartilhado, não por JWT. */
  async ingerir(dto: IngerirPreProtocoloDto): Promise<PreProtocolo> {
    let anexoOficioId: string | undefined;

    const primeiroAnexo = dto.anexos?.[0];
    if (primeiroAnexo) {
      const buffer = Buffer.from(primeiroAnexo.conteudoBase64, 'base64');
      const anexo = await this.anexosService.salvar(
        { originalname: primeiroAnexo.nomeArquivo, buffer, mimetype: primeiroAnexo.mimeType, size: buffer.length },
        'OFICIO',
      );
      anexoOficioId = anexo.id;
    }

    return this.repo.save(
      this.repo.create({
        remetente: dto.remetente,
        assunto: dto.assunto,
        corpo: dto.corpo,
        anexoOficioId,
        status: 'PENDENTE',
      }),
    );
  }

  async listar(usuario: UsuarioAutenticado) {
    this.exigirAssessorOuAdmin(usuario);
    return this.repo.find({ order: { recebidoEm: 'DESC' } });
  }

  async buscarPorId(id: string, usuario: UsuarioAutenticado): Promise<PreProtocolo> {
    this.exigirAssessorOuAdmin(usuario);
    return this.buscarOuFalhar(id);
  }

  async converter(id: string, dto: CriarSolicitacaoDto, usuario: UsuarioAutenticado) {
    this.exigirAssessorOuAdmin(usuario);
    const preProtocolo = await this.buscarOuFalhar(id);

    if (preProtocolo.status !== 'PENDENTE') {
      throw new BadRequestException('Este pré-protocolo já foi processado.');
    }

    const solicitacao = await this.solicitacoesService.criar(dto, usuario);

    preProtocolo.status = 'CONVERTIDO';
    preProtocolo.solicitacaoGeradaId = solicitacao.id;
    preProtocolo.convertidoPorId = usuario.id;
    preProtocolo.convertidoEm = new Date();
    await this.repo.save(preProtocolo);

    return solicitacao;
  }

  async descartar(id: string, motivo: string | undefined, usuario: UsuarioAutenticado): Promise<PreProtocolo> {
    this.exigirAssessorOuAdmin(usuario);
    const preProtocolo = await this.buscarOuFalhar(id);

    if (preProtocolo.status !== 'PENDENTE') {
      throw new BadRequestException('Este pré-protocolo já foi processado.');
    }

    preProtocolo.status = 'DESCARTADO';
    preProtocolo.motivoDescarte = motivo ?? null;
    preProtocolo.convertidoPorId = usuario.id;
    preProtocolo.convertidoEm = new Date();
    return this.repo.save(preProtocolo);
  }

  private exigirAssessorOuAdmin(usuario: UsuarioAutenticado): void {
    const papeisPermitidos = [Papel.ASSESSOR, Papel.ADMIN];
    const temPermissao =
      papeisPermitidos.includes(usuario.papel) ||
      (usuario.substituindo ?? []).some((s) => papeisPermitidos.includes(s.papel));
    if (!temPermissao) {
      throw new ForbiddenException('Apenas o(a) Assessor(a) do Superintendente pode acessar o Pré Protocolo.');
    }
  }

  private async buscarOuFalhar(id: string): Promise<PreProtocolo> {
    const registro = await this.repo.findOne({ where: { id } });
    if (!registro) throw new NotFoundException('Pré-protocolo não encontrado.');
    return registro;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MailerService } from './mailer.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { PreferenciaNotificacao } from '../usuarios/entities/preferencia-notificacao.entity';
import { Mobilizador } from '../parceiros/entities/mobilizador.entity';
import { Presidente } from '../parceiros/entities/presidente.entity';
import { Parceiro } from '../parceiros/entities/parceiro.entity';
import { CoordenadorRegional } from '../parceiros/entities/coordenador-regional.entity';
import { AreaPrograma } from '../parceiros/entities/area-programa.entity';
import { Papel } from '../../common/enums/papel.enum';
import { Solicitacao } from '../solicitacoes/entities/solicitacao.entity';
import { CATALOGO_NOTIFICACOES } from '../usuarios/notificacao-catalogo';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

/**
 * Ponte entre as transições do fluxo (solicitacao-state-machine.service.ts) e o
 * envio de e-mail — só envia quando o próprio usuário habilitou o canal de
 * e-mail E o tipo de evento específico em "Configurações › Notificações"
 * (ver PreferenciaNotificacao/CATALOGO_NOTIFICACOES). O envio em si hoje é
 * simulado (ver MailerService).
 */
@Injectable()
export class NotificacoesService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(PreferenciaNotificacao) private readonly preferenciaRepo: Repository<PreferenciaNotificacao>,
    @InjectRepository(Mobilizador) private readonly mobilizadorRepo: Repository<Mobilizador>,
    @InjectRepository(Presidente) private readonly presidenteRepo: Repository<Presidente>,
    @InjectRepository(Parceiro) private readonly parceiroRepo: Repository<Parceiro>,
    @InjectRepository(CoordenadorRegional) private readonly coordenadorRegionalRepo: Repository<CoordenadorRegional>,
    @InjectRepository(AreaPrograma) private readonly areaRepo: Repository<AreaPrograma>,
    private readonly mailer: MailerService,
  ) {}

  async notificarAssessoria(solicitacao: Solicitacao): Promise<void> {
    const usuarios = await this.usuarioRepo.find({ where: { papel: Papel.ASSESSOR, ativo: true } });
    await this.notificar(usuarios, 'NOVA_SOLICITACAO_ANALISE', solicitacao);
  }

  async notificarSuperintendente(solicitacao: Solicitacao): Promise<void> {
    const usuarios = await this.usuarioRepo.find({ where: { papel: Papel.SUPERINTENDENTE, ativo: true } });
    await this.notificar(usuarios, 'SOLICITACAO_APROVADA_DESPACHO', solicitacao);
  }

  async notificarDiretores(solicitacao: Solicitacao, diretoresIds: string[]): Promise<void> {
    if (diretoresIds.length === 0) return;
    const usuarios = await this.usuarioRepo.find({ where: { id: In(diretoresIds) } });
    await this.notificar(usuarios, 'SOLICITACAO_DESPACHADA', solicitacao);
  }

  async notificarCoordenadorRegional(solicitacao: Solicitacao): Promise<void> {
    const parceiro = await this.parceiroRepo.findOne({ where: { id: solicitacao.parceiroId } });
    if (!parceiro) return;
    const coordenadorRegional = await this.coordenadorRegionalRepo.findOne({
      where: { id: parceiro.coordenadorRegionalId },
    });
    if (!coordenadorRegional) return;
    const usuario = await this.usuarioRepo.findOne({
      where: { papel: Papel.COORDENADOR_REGIONAL, rmCodigoReferencia: coordenadorRegional.rmCodigo },
    });
    if (!usuario) return;
    await this.notificar([usuario], 'NOVA_SOLICITACAO_CIENCIA', solicitacao);
  }

  async notificarGestorDaArea(solicitacao: Solicitacao, areaProgramaId: string): Promise<void> {
    const area = await this.areaRepo.findOne({ where: { id: areaProgramaId }, relations: ['gestor'] });
    if (!area?.gestor) return;
    await this.notificar([area.gestor], 'ITEM_AGUARDANDO_COORDENADOR', solicitacao);
  }

  async notificarCoordenadorDesignado(solicitacao: Solicitacao, coordenadorId: string): Promise<void> {
    const usuario = await this.usuarioRepo.findOne({ where: { id: coordenadorId } });
    if (!usuario) return;
    await this.notificar([usuario], 'ITEM_DESIGNADO', solicitacao);
  }

  async notificarCoordenadorEncaminhado(solicitacao: Solicitacao, coordenadorId: string): Promise<void> {
    const usuario = await this.usuarioRepo.findOne({ where: { id: coordenadorId } });
    if (!usuario) return;
    await this.notificar([usuario], 'ITEM_ENCAMINHADO_PARA_MIM', solicitacao);
  }

  /** Mobilizador e Presidente têm a mesma autonomia — ambos recebem, quando cada um tiver habilitado. */
  async notificarMobilizadorEPresidente(
    solicitacao: Solicitacao,
    codigo: 'SOLICITACAO_DEVOLVIDA_AJUSTE' | 'DEVOLUTIVA_FINAL',
    detalhe?: string,
  ): Promise<void> {
    const usuarios = await this.usuariosDoParceiroDaSolicitacao(solicitacao);
    await this.notificar(usuarios, codigo, solicitacao, detalhe);
  }

  private async usuariosDoParceiroDaSolicitacao(solicitacao: Solicitacao): Promise<Usuario[]> {
    const resultado: Usuario[] = [];
    const [mobilizador, parceiro] = await Promise.all([
      this.mobilizadorRepo.findOne({ where: { id: solicitacao.mobilizadorId } }),
      this.parceiroRepo.findOne({ where: { id: solicitacao.parceiroId } }),
    ]);

    if (mobilizador) {
      const usuarioMobilizador = await this.usuarioRepo.findOne({
        where: { papel: Papel.MOBILIZADOR, rmCodigoReferencia: mobilizador.rmCodigo },
      });
      if (usuarioMobilizador) resultado.push(usuarioMobilizador);
    }

    if (parceiro) {
      const presidente = await this.presidenteRepo.findOne({ where: { id: parceiro.presidenteId } });
      if (presidente) {
        const usuarioPresidente = await this.usuarioRepo.findOne({
          where: { papel: Papel.PRESIDENTE, rmCodigoReferencia: presidente.rmCodigo },
        });
        if (usuarioPresidente) resultado.push(usuarioPresidente);
      }
    }

    return resultado;
  }

  /** Só envia (de forma simulada) para quem habilitou o canal de e-mail e este código de evento específico. */
  private async notificar(
    usuarios: Usuario[],
    codigo: string,
    solicitacao: Solicitacao,
    detalhe?: string,
  ): Promise<void> {
    for (const usuario of usuarios) {
      if (!usuario?.email) continue;

      const preferencia = await this.preferenciaRepo.findOne({ where: { usuarioId: usuario.id } });
      if (!preferencia?.canalEmail || !preferencia.tiposAtivos?.includes(codigo)) continue;

      const tipo = CATALOGO_NOTIFICACOES[usuario.papel]?.find((t) => t.codigo === codigo);
      const assunto = `[e-Senar] ${tipo?.titulo ?? codigo} — Nº ${solicitacao.numeroProcesso ?? solicitacao.numeroDocumento}`;
      const corpo = [
        `Olá, ${usuario.nome}.`,
        '',
        tipo?.descricao ?? '',
        detalhe ?? '',
        '',
        `Assunto do protocolo: ${solicitacao.assunto}`,
        `Nº do Processo: ${solicitacao.numeroProcesso ?? '—'}`,
        `Acesse: ${FRONTEND_URL}/solicitacoes/${solicitacao.id}`,
      ]
        .filter(Boolean)
        .join('\n');

      await this.mailer.enviar(usuario.email, assunto, corpo);
    }
  }
}

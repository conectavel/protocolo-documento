import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Solicitacao } from './entities/solicitacao.entity';
import { ItemSolicitacao } from './entities/item-solicitacao.entity';
import { Tramitacao } from './entities/tramitacao.entity';
import { Devolutiva } from '../devolutivas/entities/devolutiva.entity';
import {
  AcaoTramitacao,
  ResultadoDevolutiva,
  StatusItem,
  StatusMacro,
} from '../../common/enums/solicitacao.enum';
import { UsuarioAutenticado } from '../../common/guards/jwt-auth.guard';
import { RegistrarDevolutivaDto } from './dto/transicoes.dto';

const FINALIZADOS: StatusItem[] = [
  StatusItem.ATENDIDO,
  StatusItem.PARCIALMENTE_ATENDIDO,
  StatusItem.NAO_ATENDIDO,
];

/**
 * Implementa a máquina de estados descrita em requirements.md §5 e as regras HU01–HU09.
 * Toda transição:
 *  1) valida o estado atual (pré-condição),
 *  2) aplica a mudança,
 *  3) grava um registro imutável em `tramitacoes` (histórico append-only).
 */
@Injectable()
export class SolicitacaoStateMachineService {
  constructor(
    @InjectRepository(Solicitacao) private readonly solicitacaoRepo: Repository<Solicitacao>,
    @InjectRepository(ItemSolicitacao) private readonly itemRepo: Repository<ItemSolicitacao>,
    @InjectRepository(Tramitacao) private readonly tramitacaoRepo: Repository<Tramitacao>,
    @InjectRepository(Devolutiva) private readonly devolutivaRepo: Repository<Devolutiva>,
  ) {}

  // ---------------------------------------------------------------- HU02
  async darCiencia(solicitacao: Solicitacao, usuario: UsuarioAutenticado | null, automatica: boolean) {
    this.assertStatus(solicitacao, StatusMacro.EM_ANALISE_REGIONAL);

    solicitacao.dataCienciaRegional = new Date();
    solicitacao.cienciaAutomatica = automatica;
    solicitacao.statusMacro = StatusMacro.EM_ANALISE_ASSESSORIA;
    solicitacao.etapaAtual = 'Análise da Assessoria';

    await this.solicitacaoRepo.save(solicitacao);
    await this.registrarTramitacao(solicitacao, {
      deEtapa: 'Análise do Regional',
      paraEtapa: 'Análise da Assessoria',
      acao: automatica ? AcaoTramitacao.CIENCIA_AUTOMATICA : AcaoTramitacao.CIENCIA,
      usuario,
      motivo: automatica ? 'Prazo de 24h para ciência expirado — avanço automático.' : undefined,
    });
  }

  // ---------------------------------------------------------------- HU03
  async analisarAssessoria(
    solicitacao: Solicitacao,
    usuario: UsuarioAutenticado,
    decisao: 'APROVAR' | 'DEVOLVER_AJUSTE' | 'RECUSAR',
    motivo?: string,
  ) {
    this.assertStatus(solicitacao, StatusMacro.EM_ANALISE_ASSESSORIA);
    const deEtapa = solicitacao.etapaAtual;

    if (decisao === 'APROVAR') {
      solicitacao.statusMacro = StatusMacro.EM_DESPACHO;
      solicitacao.etapaAtual = 'Superintendência — Despacho';
      await this.solicitacaoRepo.save(solicitacao);
      await this.registrarTramitacao(solicitacao, {
        deEtapa,
        paraEtapa: solicitacao.etapaAtual,
        acao: AcaoTramitacao.APROVAR,
        usuario,
      });
      return;
    }

    if (decisao === 'DEVOLVER_AJUSTE') {
      solicitacao.statusMacro = StatusMacro.DEVOLVIDO_AJUSTE;
      solicitacao.etapaAtual = 'Aguardando ajuste do Mobilizador';
      solicitacao.motivoDevolucaoOuRecusa = motivo ?? null;
      await this.solicitacaoRepo.save(solicitacao);
      await this.registrarTramitacao(solicitacao, {
        deEtapa,
        paraEtapa: solicitacao.etapaAtual,
        acao: AcaoTramitacao.DEVOLVER_AJUSTE,
        usuario,
        motivo,
      });
      return;
    }

    // RECUSAR
    solicitacao.statusMacro = StatusMacro.CANCELADO;
    solicitacao.etapaAtual = 'Encerrado — Recusado pela Assessoria';
    solicitacao.motivoDevolucaoOuRecusa = motivo ?? null;
    await this.solicitacaoRepo.save(solicitacao);
    await this.registrarTramitacao(solicitacao, {
      deEtapa,
      paraEtapa: solicitacao.etapaAtual,
      acao: AcaoTramitacao.RECUSAR,
      usuario,
      motivo,
    });
  }

  /** Mobilizador reenvia após ajuste — reinicia o ciclo a partir da ciência regional. */
  async reenviarAposAjuste(solicitacao: Solicitacao, usuario: UsuarioAutenticado) {
    this.assertStatus(solicitacao, StatusMacro.DEVOLVIDO_AJUSTE);

    solicitacao.statusMacro = StatusMacro.EM_ANALISE_REGIONAL;
    solicitacao.etapaAtual = 'Análise do Regional';
    solicitacao.dataCienciaRegional = null;
    solicitacao.cienciaAutomatica = false;
    solicitacao.prazoCienciaRegional = new Date(Date.now() + 24 * 60 * 60 * 1000);
    solicitacao.motivoDevolucaoOuRecusa = null;

    await this.solicitacaoRepo.save(solicitacao);
    await this.registrarTramitacao(solicitacao, {
      deEtapa: 'Aguardando ajuste do Mobilizador',
      paraEtapa: 'Análise do Regional',
      acao: AcaoTramitacao.REENVIAR_APOS_AJUSTE,
      usuario,
    });
  }

  // ---------------------------------------------------------------- HU04
  async despacharSuperintendente(
    solicitacao: Solicitacao,
    usuario: UsuarioAutenticado,
    diretoriaDestino: 'EDUCACIONAL',
  ) {
    this.assertStatus(solicitacao, StatusMacro.EM_DESPACHO);
    const deEtapa = solicitacao.etapaAtual;

    solicitacao.statusMacro = StatusMacro.EM_EXECUCAO;
    solicitacao.etapaAtual = 'Diretor Educacional — Direcionamento';

    await this.solicitacaoRepo.save(solicitacao);
    await this.registrarTramitacao(solicitacao, {
      deEtapa,
      paraEtapa: solicitacao.etapaAtual,
      acao: AcaoTramitacao.DESPACHAR,
      usuario,
      motivo: `Diretoria destino: ${diretoriaDestino}`,
    });
  }

  // ---------------------------------------------------------------- HU05
  /**
   * Direciona a solicitação (e todo item ainda sem área definida) para a Área/Programa.
   * Se `coordenadorId` for informado, o Diretor já designa diretamente o coordenador
   * (pulando a etapa do Gestor); caso contrário, a solicitação aguarda o Gestor (HU06).
   */
  async direcionarParaArea(
    solicitacao: Solicitacao,
    usuario: UsuarioAutenticado,
    areaProgramaId: string,
    coordenadorId: string | undefined,
    nomeArea: string,
  ) {
    this.assertStatus(solicitacao, StatusMacro.EM_EXECUCAO);
    const deEtapa = solicitacao.etapaAtual;

    solicitacao.areaProgramaId = areaProgramaId;
    solicitacao.etapaAtual = coordenadorId
      ? `${nomeArea} — Execução`
      : `${nomeArea} — Aguardando designação do Gestor`;

    const itensSemArea = (solicitacao.itens ?? []).filter((item) => !item.areaProgramaId);
    for (const item of itensSemArea) {
      item.areaProgramaId = areaProgramaId;
      item.statusItem = StatusItem.EM_ANALISE;
      if (coordenadorId) {
        item.coordenadorResponsavelId = coordenadorId;
      }
      await this.itemRepo.save(item);
    }

    if (coordenadorId) {
      solicitacao.coordenadorDesignadoId = coordenadorId;
    }

    await this.solicitacaoRepo.save(solicitacao);
    await this.registrarTramitacao(solicitacao, {
      deEtapa,
      paraEtapa: solicitacao.etapaAtual,
      acao: AcaoTramitacao.DIRECIONAR,
      usuario,
      motivo: `Área/Programa: ${nomeArea}`,
    });
  }

  // ---------------------------------------------------------------- HU06
  async designarCoordenadorNoItem(
    item: ItemSolicitacao,
    solicitacao: Solicitacao,
    usuario: UsuarioAutenticado,
    coordenadorId: string,
  ) {
    item.coordenadorResponsavelId = coordenadorId;
    item.statusItem = StatusItem.EM_ANALISE;
    await this.itemRepo.save(item);

    solicitacao.coordenadorDesignadoId = coordenadorId;
    solicitacao.etapaAtual = solicitacao.etapaAtual.replace(
      'Aguardando designação do Gestor',
      'Execução',
    );
    await this.solicitacaoRepo.save(solicitacao);

    await this.registrarTramitacao(solicitacao, {
      itemSolicitacaoId: item.id,
      deEtapa: 'Aguardando designação do Gestor',
      paraEtapa: 'Coordenador designado',
      acao: AcaoTramitacao.DESIGNAR_COORDENADOR,
      usuario,
    });
  }

  // ---------------------------------------------------------------- HU07
  async aceitarItem(item: ItemSolicitacao, solicitacao: Solicitacao, usuario: UsuarioAutenticado) {
    await this.registrarTramitacao(solicitacao, {
      itemSolicitacaoId: item.id,
      deEtapa: item.statusItem,
      paraEtapa: 'Aceito para atendimento',
      acao: AcaoTramitacao.ACEITAR,
      usuario,
    });
  }

  /** HU07/HU08 — coordenador identifica que o item pertence a outra área e o encaminha, sem encerrar a solicitação. */
  async encaminharItemParaOutraArea(
    item: ItemSolicitacao,
    solicitacao: Solicitacao,
    usuario: UsuarioAutenticado,
    novaAreaProgramaId: string,
    nomeNovaArea: string,
    motivo: string,
  ) {
    const areaAnterior = item.areaProgramaId;
    item.areaProgramaId = novaAreaProgramaId;
    item.coordenadorResponsavelId = null;
    item.statusItem = StatusItem.ENCAMINHADO;
    await this.itemRepo.save(item);

    await this.registrarTramitacao(solicitacao, {
      itemSolicitacaoId: item.id,
      deEtapa: areaAnterior,
      paraEtapa: nomeNovaArea,
      acao: AcaoTramitacao.ENCAMINHAR_OUTRA_AREA,
      usuario,
      motivo,
    });
  }

  /** HU07/HU09 — registra a devolutiva de um item e recalcula o status macro (derivado). */
  async registrarDevolutiva(
    item: ItemSolicitacao,
    solicitacao: Solicitacao,
    usuario: UsuarioAutenticado,
    dto: RegistrarDevolutivaDto,
  ): Promise<Devolutiva> {
    let devolutiva = await this.devolutivaRepo.findOne({ where: { itemSolicitacaoId: item.id } });
    if (!devolutiva) {
      devolutiva = this.devolutivaRepo.create({ itemSolicitacaoId: item.id });
    }

    Object.assign(devolutiva, {
      resultado: dto.resultado,
      justificativa: dto.justificativa,
      dataEvento: dto.dataEvento,
      horario: dto.horario,
      local: dto.local,
      numeroEventoTurma: dto.numeroEventoTurma,
      numeroProcessoAceiteFluig: dto.numeroProcessoAceiteFluig,
      registradoPorId: usuario.id,
      registradoPorNome: usuario.nome,
    });
    await this.devolutivaRepo.save(devolutiva);

    item.statusItem = dto.resultado as unknown as StatusItem;
    await this.itemRepo.save(item);

    await this.registrarTramitacao(solicitacao, {
      itemSolicitacaoId: item.id,
      deEtapa: 'Em execução',
      paraEtapa: `Devolutiva: ${dto.resultado}`,
      acao: AcaoTramitacao.REGISTRAR_DEVOLUTIVA,
      usuario,
      motivo: dto.justificativa,
    });

    await this.recalcularStatusMacro(solicitacao);
    return devolutiva;
  }

  /** Status macro é sempre derivado do conjunto de itens (requirements.md §5 e HU08/HU09). */
  private async recalcularStatusMacro(solicitacao: Solicitacao): Promise<void> {
    const itens = await this.itemRepo.find({ where: { solicitacaoId: solicitacao.id } });
    if (itens.length === 0) {
      return; // guarda defensiva: nunca conclui a solicitação sem itens carregados
    }
    const todosFinalizados = itens.every((item) => FINALIZADOS.includes(item.statusItem));

    if (!todosFinalizados) {
      return; // mantém etapa/status corrente — ainda há item pendente de atendimento
    }

    const todosAtendidos = itens.every((item) => item.statusItem === StatusItem.ATENDIDO);
    const todosNaoAtendidos = itens.every((item) => item.statusItem === StatusItem.NAO_ATENDIDO);

    solicitacao.statusMacro = todosAtendidos
      ? StatusMacro.ATENDIDO
      : todosNaoAtendidos
        ? StatusMacro.NAO_ATENDIDO
        : StatusMacro.PARCIALMENTE_ATENDIDO;
    solicitacao.etapaAtual = 'Concluído — devolutiva consolidada disponível';

    await this.solicitacaoRepo.save(solicitacao);
    await this.registrarTramitacao(solicitacao, {
      deEtapa: 'Em execução',
      paraEtapa: solicitacao.statusMacro,
      acao: AcaoTramitacao.REGISTRAR_DEVOLUTIVA,
      usuario: null,
      motivo: 'Status consolidado automaticamente a partir das devolutivas de todos os itens.',
    });
  }

  private assertStatus(solicitacao: Solicitacao, esperado: StatusMacro): void {
    if (solicitacao.statusMacro !== esperado) {
      throw new ConflictException(
        `Ação não permitida: a solicitação está em "${solicitacao.statusMacro}", esperado "${esperado}".`,
      );
    }
  }

  private async registrarTramitacao(
    solicitacao: Solicitacao,
    dados: {
      itemSolicitacaoId?: string;
      deEtapa?: string;
      paraEtapa: string;
      acao: AcaoTramitacao;
      usuario: UsuarioAutenticado | null;
      motivo?: string;
    },
  ): Promise<Tramitacao> {
    const tramitacao = this.tramitacaoRepo.create({
      solicitacaoId: solicitacao.id,
      itemSolicitacaoId: dados.itemSolicitacaoId,
      deEtapa: dados.deEtapa,
      paraEtapa: dados.paraEtapa,
      acao: dados.acao,
      motivo: dados.motivo,
      usuarioId: dados.usuario?.id,
      usuarioNome: dados.usuario?.nome ?? 'Sistema (automático)',
    });
    return this.tramitacaoRepo.save(tramitacao);
  }
}

import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
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
import { EditarItemDto, RegistrarDevolutivaDto } from './dto/transicoes.dto';
import { NotificacoesService } from '../notificacoes/notificacoes.service';

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
    private readonly notificacoes: NotificacoesService,
  ) {}

  // ---------------------------------------------------------------- HU02
  async darCiencia(solicitacao: Solicitacao, usuario: UsuarioAutenticado | null, automatica: boolean) {
    this.assertStatus(solicitacao, StatusMacro.EM_ANALISE_REGIONAL);

    solicitacao.dataCienciaRegional = new Date();
    solicitacao.cienciaAutomatica = automatica;
    solicitacao.statusMacro = StatusMacro.EM_ANALISE_ASSESSORIA;
    solicitacao.etapaAtual = 'Análise da Assessoria';

    await this.solicitacaoRepo.update(solicitacao.id, {
      dataCienciaRegional: solicitacao.dataCienciaRegional,
      cienciaAutomatica: solicitacao.cienciaAutomatica,
      statusMacro: solicitacao.statusMacro,
      etapaAtual: solicitacao.etapaAtual,
    });
    await this.registrarTramitacao(solicitacao, {
      deEtapa: 'Análise do Regional',
      paraEtapa: 'Análise da Assessoria',
      acao: automatica ? AcaoTramitacao.CIENCIA_AUTOMATICA : AcaoTramitacao.CIENCIA,
      usuario,
      motivo: automatica ? 'Prazo de 24h para ciência expirado — avanço automático.' : undefined,
    });
    await this.notificacoes.notificarAssessoria(solicitacao);
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
      await this.solicitacaoRepo.update(solicitacao.id, {
        statusMacro: solicitacao.statusMacro,
        etapaAtual: solicitacao.etapaAtual,
      });
      await this.registrarTramitacao(solicitacao, {
        deEtapa,
        paraEtapa: solicitacao.etapaAtual,
        acao: AcaoTramitacao.APROVAR,
        usuario,
        motivo,
      });
      await this.notificacoes.notificarSuperintendente(solicitacao);
      return;
    }

    if (decisao === 'DEVOLVER_AJUSTE') {
      solicitacao.statusMacro = StatusMacro.DEVOLVIDO_AJUSTE;
      solicitacao.etapaAtual = 'Aguardando ajuste do Mobilizador';
      solicitacao.motivoDevolucaoOuRecusa = motivo ?? null;
      await this.solicitacaoRepo.update(solicitacao.id, {
        statusMacro: solicitacao.statusMacro,
        etapaAtual: solicitacao.etapaAtual,
        motivoDevolucaoOuRecusa: solicitacao.motivoDevolucaoOuRecusa,
      });
      await this.registrarTramitacao(solicitacao, {
        deEtapa,
        paraEtapa: solicitacao.etapaAtual,
        acao: AcaoTramitacao.DEVOLVER_AJUSTE,
        usuario,
        motivo,
      });
      await this.notificacoes.notificarMobilizadorEPresidente(
        solicitacao,
        'SOLICITACAO_DEVOLVIDA_AJUSTE',
        motivo ? `Motivo: ${motivo}` : undefined,
      );
      return;
    }

    // RECUSAR
    solicitacao.statusMacro = StatusMacro.CANCELADO;
    solicitacao.etapaAtual = 'Encerrado — Recusado pela Assessoria';
    solicitacao.motivoDevolucaoOuRecusa = motivo ?? null;
    await this.solicitacaoRepo.update(solicitacao.id, {
      statusMacro: solicitacao.statusMacro,
      etapaAtual: solicitacao.etapaAtual,
      motivoDevolucaoOuRecusa: solicitacao.motivoDevolucaoOuRecusa,
    });
    await this.registrarTramitacao(solicitacao, {
      deEtapa,
      paraEtapa: solicitacao.etapaAtual,
      acao: AcaoTramitacao.RECUSAR,
      usuario,
      motivo,
    });
    await this.notificacoes.notificarMobilizadorEPresidente(
      solicitacao,
      'DEVOLUTIVA_FINAL',
      `Sua solicitação foi recusada pela Assessoria.${motivo ? ` Motivo: ${motivo}` : ''}`,
    );
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

    await this.solicitacaoRepo.update(solicitacao.id, {
      statusMacro: solicitacao.statusMacro,
      etapaAtual: solicitacao.etapaAtual,
      dataCienciaRegional: solicitacao.dataCienciaRegional,
      cienciaAutomatica: solicitacao.cienciaAutomatica,
      prazoCienciaRegional: solicitacao.prazoCienciaRegional,
      motivoDevolucaoOuRecusa: solicitacao.motivoDevolucaoOuRecusa,
    });
    await this.registrarTramitacao(solicitacao, {
      deEtapa: 'Aguardando ajuste do Mobilizador',
      paraEtapa: 'Análise do Regional',
      acao: AcaoTramitacao.REENVIAR_APOS_AJUSTE,
      usuario,
    });
    await this.notificacoes.notificarCoordenadorRegional(solicitacao);
  }

  // ---------------------------------------------------------------- HU04
  /**
   * O Superintendente pode escolher mais de um Diretor responsável por esta
   * solicitação — cada um deles poderá, depois, direcionar os itens que
   * pertencem ao time dele para a Área/Programa correta (bifurcação por item,
   * ver `direcionarItemParaArea`). Só quem estiver em `diretoresIds` poderá agir.
   */
  async despacharSuperintendente(
    solicitacao: Solicitacao,
    usuario: UsuarioAutenticado,
    diretoriaDestino: 'EDUCACIONAL',
    diretoresIds: string[],
  ) {
    this.assertStatus(solicitacao, StatusMacro.EM_DESPACHO);
    const deEtapa = solicitacao.etapaAtual;

    solicitacao.statusMacro = StatusMacro.EM_EXECUCAO;
    solicitacao.etapaAtual = 'Diretor Educacional — Direcionamento';
    solicitacao.diretoresDesignadosIds = diretoresIds;

    await this.solicitacaoRepo.update(solicitacao.id, {
      statusMacro: solicitacao.statusMacro,
      etapaAtual: solicitacao.etapaAtual,
      diretoresDesignadosIds: solicitacao.diretoresDesignadosIds,
    });
    await this.registrarTramitacao(solicitacao, {
      deEtapa,
      paraEtapa: solicitacao.etapaAtual,
      acao: AcaoTramitacao.DESPACHAR,
      usuario,
      motivo: `Diretoria destino: ${diretoriaDestino} · ${diretoresIds.length} diretor(es) designado(s)`,
    });
    await this.notificacoes.notificarDiretores(solicitacao, diretoresIds);
  }

  // ---------------------------------------------------------------- HU05
  /**
   * Direciona UM item específico para a Área/Programa — cada item de uma mesma
   * solicitação pode ir para uma área diferente (bifurcação), cada um roteado
   * pelo Diretor responsável pelo respectivo time. Se `coordenadorId` for
   * informado, o Diretor já designa diretamente o coordenador daquele item
   * (pulando a etapa do Gestor); caso contrário, o item aguarda o Gestor (HU06).
   */
  async direcionarItemParaArea(
    item: ItemSolicitacao,
    solicitacao: Solicitacao,
    usuario: UsuarioAutenticado,
    areaProgramaId: string,
    coordenadorId: string | undefined,
    nomeArea: string,
    observacao?: string,
  ) {
    this.assertStatus(solicitacao, StatusMacro.EM_EXECUCAO);

    item.areaProgramaId = areaProgramaId;
    item.statusItem = StatusItem.EM_ANALISE;
    if (coordenadorId) {
      item.coordenadorResponsavelId = coordenadorId;
    }
    await this.itemRepo.save(item);

    await this.recalcularEtapaDirecionamento(solicitacao);

    const motivo = observacao?.trim()
      ? `Área/Programa: ${nomeArea} — ${observacao.trim()}`
      : `Área/Programa: ${nomeArea}`;

    await this.registrarTramitacao(solicitacao, {
      itemSolicitacaoId: item.id,
      deEtapa: 'Diretor Educacional — Direcionamento',
      paraEtapa: coordenadorId ? `${nomeArea} — Execução` : `${nomeArea} — Aguardando designação do Gestor`,
      acao: AcaoTramitacao.DIRECIONAR,
      usuario,
      motivo,
    });

    if (coordenadorId) {
      await this.notificacoes.notificarCoordenadorDesignado(solicitacao, coordenadorId);
    } else {
      await this.notificacoes.notificarGestorDaArea(solicitacao, areaProgramaId);
    }
  }

  /**
   * "Análise e Providência" — chamado pelo Diretor quando encerra o
   * direcionamento (todos os itens já têm Área/Programa, ou não precisam mais
   * de uma porque foram excluídos do fluxo antes de chegar aqui). Antes desta
   * correção o botão só disparava um toast no frontend, sem persistir nada:
   * a solicitação nunca deixava de aparecer como "Diretor Educacional —
   * Direcionamento" para os demais papéis internos, dando a impressão de que
   * o processo tinha parado ali mesmo com os itens já roteados corretamente.
   */
  async confirmarDirecionamento(solicitacao: Solicitacao, usuario: UsuarioAutenticado): Promise<void> {
    this.assertStatus(solicitacao, StatusMacro.EM_EXECUCAO);

    const itens = await this.itemRepo.find({ where: { solicitacaoId: solicitacao.id } });
    const pendente = itens.find(
      (item) => !FINALIZADOS.includes(item.statusItem) && !item.areaProgramaId,
    );
    if (pendente) {
      throw new BadRequestException('Ainda há itens sem Área/Programa direcionada.');
    }

    await this.recalcularEtapaDirecionamento(solicitacao);

    await this.registrarTramitacao(solicitacao, {
      deEtapa: 'Diretor Educacional — Direcionamento',
      paraEtapa: solicitacao.etapaAtual ?? 'Aguardando designação do Gestor',
      acao: AcaoTramitacao.CONFIRMAR_DIRECIONAMENTO,
      usuario,
      motivo: 'Diretor concluiu o direcionamento de todos os itens.',
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

    await this.recalcularEtapaDirecionamento(solicitacao);

    await this.registrarTramitacao(solicitacao, {
      itemSolicitacaoId: item.id,
      deEtapa: 'Aguardando designação do Gestor',
      paraEtapa: 'Coordenador designado',
      acao: AcaoTramitacao.DESIGNAR_COORDENADOR,
      usuario,
    });
    await this.notificacoes.notificarCoordenadorDesignado(solicitacao, coordenadorId);
  }

  /**
   * `etapaAtual` é um único rótulo textual por solicitação (usado pelo stepper
   * do frontend), mas com a bifurcação por item não existe mais "uma área" para
   * nomear ali. Por isso o rótulo passa a refletir o estágio MENOS avançado
   * entre os itens: enquanto houver item sem área, mostra "Direcionamento";
   * quando todos já têm área mas algum ainda não tem coordenador, mostra
   * "Aguardando designação do Gestor"; só quando todos os itens já têm
   * coordenador é que avança para "Execução".
   */
  private async recalcularEtapaDirecionamento(solicitacao: Solicitacao): Promise<void> {
    const itens = await this.itemRepo.find({ where: { solicitacaoId: solicitacao.id } });
    // Itens já finalizados (ex.: excluídos do fluxo pela Assessoria/Superintendência,
    // RN-09) nunca recebem areaProgramaId/coordenadorResponsavelId — sem filtrá-los
    // aqui, `etapaAtual` ficava preso em "Direcionamento" para sempre nessas
    // solicitações, mesmo depois do Diretor direcionar todos os itens restantes.
    const itensAtivos = itens.filter((item) => !FINALIZADOS.includes(item.statusItem));

    if (itensAtivos.some((item) => !item.areaProgramaId)) {
      solicitacao.etapaAtual = 'Diretor Educacional — Direcionamento';
    } else if (itensAtivos.some((item) => !item.coordenadorResponsavelId)) {
      solicitacao.etapaAtual = 'Aguardando designação do Gestor';
    } else {
      solicitacao.etapaAtual = 'Execução';
    }

    // update() em vez de save(): `solicitacao.itens` aqui é o snapshot ANTERIOR
    // ao roteamento deste item (carregado no início da requisição) — como
    // `Solicitacao.itens` tem cascade:true, um save() do agregado inteiro
    // reescreveria cada item com esses dados desatualizados, apagando o
    // direcionamento que acabamos de gravar via itemRepo.save().
    await this.solicitacaoRepo.update(solicitacao.id, { etapaAtual: solicitacao.etapaAtual });
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
    await this.notificacoes.notificarGestorDaArea(solicitacao, novaAreaProgramaId);
  }

  /**
   * O Coordenador pode corrigir os campos que o Mobilizador/Presidente
   * preencheu ao protocolar — o valor original já está preservado em
   * `item.valoresOriginais` desde a criação do item, então aqui só
   * aplicamos os novos valores (o histórico completo é, na prática, "original
   * vs. atual", sem precisar guardar cada edição intermediária).
   */
  async editarItem(
    item: ItemSolicitacao,
    solicitacao: Solicitacao,
    usuario: UsuarioAutenticado,
    dto: EditarItemDto,
  ): Promise<ItemSolicitacao> {
    if (dto.tipoEvento !== undefined) item.tipoEvento = dto.tipoEvento;
    if (dto.acaoAtividade !== undefined) item.acaoAtividade = dto.acaoAtividade;
    if (dto.disciplina !== undefined) item.disciplina = dto.disciplina;
    if (dto.turno !== undefined) item.turno = dto.turno;
    if (dto.dataInicio !== undefined) item.dataInicio = dto.dataInicio;
    if (dto.dataFim !== undefined) item.dataFim = dto.dataFim;

    const salvo = await this.itemRepo.save(item);

    await this.registrarTramitacao(solicitacao, {
      itemSolicitacaoId: item.id,
      deEtapa: 'Dados informados pelo Mobilizador',
      paraEtapa: 'Dados corrigidos pelo Coordenador',
      acao: AcaoTramitacao.EDITAR_ITEM,
      usuario,
    });

    return salvo;
  }

  /**
   * O(a) Assessor(a) (ao aprovar) e o Superintendente (ao despachar) podem
   * decidir que um item não vai avançar pelo fluxo das áreas — o item nunca
   * passa por Diretor/Gestor/Coordenador e recebe uma devolutiva registrada
   * diretamente por quem excluiu. Por padrão o resultado é "Não Atendido"
   * (o caso comum de desmarcar "Atender"), mas também serve para o Convite
   * (HU03) — exclusivo da Assessoria, que fala direto com o Superintendente
   * e decide se atende ou não, sem passar pelo resto do fluxo de qualquer forma.
   * Isso torna o item "finalizado" para fins do cálculo do status macro geral,
   * exatamente como qualquer outra devolutiva.
   */
  async excluirItemDoFluxo(
    item: ItemSolicitacao,
    solicitacao: Solicitacao,
    usuario: UsuarioAutenticado,
    observacao?: string,
    resultado: ResultadoDevolutiva = ResultadoDevolutiva.NAO_ATENDIDO,
  ): Promise<void> {
    if (item.statusItem !== StatusItem.PENDENTE) {
      return; // já finalizado (por devolutiva normal ou exclusão anterior) — idempotente
    }

    const statusPorResultado: Record<ResultadoDevolutiva, StatusItem> = {
      [ResultadoDevolutiva.ATENDIDO]: StatusItem.ATENDIDO,
      [ResultadoDevolutiva.PARCIALMENTE_ATENDIDO]: StatusItem.PARCIALMENTE_ATENDIDO,
      [ResultadoDevolutiva.NAO_ATENDIDO]: StatusItem.NAO_ATENDIDO,
    };
    const mensagemPadrao =
      resultado === ResultadoDevolutiva.ATENDIDO
        ? `Atendido diretamente pela Assessoria (${usuario.nome}).`
        : `Item não incluído no fluxo por ${usuario.nome}.`;

    const devolutiva = this.devolutivaRepo.create({
      itemSolicitacaoId: item.id,
      resultado,
      justificativa: observacao?.trim() || mensagemPadrao,
      registradoPorId: usuario.id,
      registradoPorNome: usuario.nome,
    });
    await this.devolutivaRepo.save(devolutiva);

    item.statusItem = statusPorResultado[resultado];
    await this.itemRepo.save(item);

    await this.registrarTramitacao(solicitacao, {
      itemSolicitacaoId: item.id,
      deEtapa: 'Pendente',
      paraEtapa: resultado === ResultadoDevolutiva.ATENDIDO ? 'Atendido pela Assessoria' : 'Não incluído no fluxo',
      acao: AcaoTramitacao.EXCLUIR_ITEM_DO_FLUXO,
      usuario,
      motivo: devolutiva.justificativa,
    });

    await this.recalcularStatusMacro(solicitacao);
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

    // update(), não save() — mesma razão de recalcularEtapaDirecionamento: evitar
    // que o cascade de `itens` reescreva o item cuja devolutiva acabou de ser salva.
    await this.solicitacaoRepo.update(solicitacao.id, {
      statusMacro: solicitacao.statusMacro,
      etapaAtual: solicitacao.etapaAtual,
    });
    await this.registrarTramitacao(solicitacao, {
      deEtapa: 'Em execução',
      paraEtapa: solicitacao.statusMacro,
      acao: AcaoTramitacao.REGISTRAR_DEVOLUTIVA,
      usuario: null,
      motivo: 'Status consolidado automaticamente a partir das devolutivas de todos os itens.',
    });
    await this.notificacoes.notificarMobilizadorEPresidente(solicitacao, 'DEVOLUTIVA_FINAL');
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
      usuarioPapel: dados.usuario?.papel ?? null,
    });
    return this.tramitacaoRepo.save(tramitacao);
  }
}

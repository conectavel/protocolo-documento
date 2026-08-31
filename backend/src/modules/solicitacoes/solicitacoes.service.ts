import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Solicitacao } from './entities/solicitacao.entity';
import { ItemSolicitacao } from './entities/item-solicitacao.entity';
import { Tramitacao } from './entities/tramitacao.entity';
import { AreaPrograma } from '../parceiros/entities/area-programa.entity';
import { Parceiro } from '../parceiros/entities/parceiro.entity';
import { AnexosService } from '../anexos/anexos.service';
import { SolicitacaoStateMachineService } from './solicitacao-state-machine.service';
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
import { Papel, PAPEIS_INTERNOS } from '../../common/enums/papel.enum';
import { StatusMacro, TipoItem } from '../../common/enums/solicitacao.enum';
import { UsuarioAutenticado } from '../../common/guards/jwt-auth.guard';

const STATUS_FINALIZADOS: StatusMacro[] = [
  StatusMacro.ATENDIDO,
  StatusMacro.PARCIALMENTE_ATENDIDO,
  StatusMacro.NAO_ATENDIDO,
];

const PAGE_SIZE_DEFAULT = 10;

@Injectable()
export class SolicitacoesService {
  constructor(
    @InjectRepository(Solicitacao) private readonly solicitacaoRepo: Repository<Solicitacao>,
    @InjectRepository(ItemSolicitacao) private readonly itemRepo: Repository<ItemSolicitacao>,
    @InjectRepository(Tramitacao) private readonly tramitacaoRepo: Repository<Tramitacao>,
    @InjectRepository(AreaPrograma) private readonly areaProgramaRepo: Repository<AreaPrograma>,
    @InjectRepository(Parceiro) private readonly parceiroRepo: Repository<Parceiro>,
    private readonly anexosService: AnexosService,
    private readonly stateMachine: SolicitacaoStateMachineService,
  ) {}

  // ---------------------------------------------------------------- HU01
  async criar(dto: CriarSolicitacaoDto, usuario: UsuarioAutenticado): Promise<Solicitacao> {
    if (usuario.papel === Papel.MOBILIZADOR && usuario.parceiroId !== dto.parceiroId) {
      throw new ForbiddenException('Mobilizador só pode protocolar em nome do próprio Parceiro.');
    }

    const parceiro = await this.parceiroRepo.findOne({ where: { id: dto.parceiroId } });
    if (!parceiro) throw new NotFoundException('Parceiro não encontrado.');
    if (parceiro.mobilizadorId !== dto.mobilizadorId) {
      throw new ForbiddenException('O Mobilizador informado não pertence a este Parceiro.');
    }

    const agora = new Date();
    const solicitacao = this.solicitacaoRepo.create({
      parceiroId: dto.parceiroId,
      mobilizadorId: dto.mobilizadorId,
      municipio: dto.municipio,
      assunto: dto.assunto,
      numeroDocumento: dto.numeroDocumento ?? (await this.gerarProximoNumeroDocumento()),
      dataDocumento: dto.dataDocumento,
      observacao: dto.observacao,
      anexoOficioId: dto.anexoOficioId,
      dataSolicitacao: agora,
      prazoCienciaRegional: new Date(agora.getTime() + 24 * 60 * 60 * 1000),
      criadoPor: usuario.nome,
      alteradoPor: usuario.nome,
      itens: dto.itens.map((item) => this.itemRepo.create({ ...item })),
    });

    const salva = await this.solicitacaoRepo.save(solicitacao);
    await this.anexosService.vincularSolicitacao(dto.anexoOficioId, salva.id);
    return salva;
  }

  async listar(usuario: UsuarioAutenticado, filtros: ListarSolicitacoesDto) {
    const page = Number(filtros.page ?? '1');
    const pageSize = Number(filtros.pageSize ?? String(PAGE_SIZE_DEFAULT));

    const qb = this.solicitacaoRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.itens', 'itens')
      .leftJoinAndSelect('itens.devolutiva', 'devolutiva')
      .leftJoinAndSelect('itens.areaPrograma', 'itemAreaPrograma')
      .leftJoinAndSelect('itens.coordenadorResponsavel', 'itemCoordenadorResponsavel')
      .leftJoinAndSelect('s.parceiro', 'parceiro')
      .leftJoinAndSelect('s.mobilizador', 'mobilizador')
      .orderBy('s.criadoEm', 'DESC');

    this.aplicarEscopoPorPapel(qb, usuario);

    if (filtros.status) qb.andWhere('s.statusMacro = :status', { status: filtros.status });
    if (filtros.parceiroId) qb.andWhere('s.parceiroId = :parceiroId', { parceiroId: filtros.parceiroId });
    if (filtros.numeroDocumento)
      qb.andWhere('s.numeroDocumento ILIKE :doc', { doc: `%${filtros.numeroDocumento}%` });
    if (filtros.dataInicio) qb.andWhere('s.dataDocumento >= :di', { di: filtros.dataInicio });
    if (filtros.dataFim) qb.andWhere('s.dataDocumento <= :df', { df: filtros.dataFim });
    if (filtros.acaoAtividade)
      qb.andWhere('itens.acaoAtividade ILIKE :aa', { aa: `%${filtros.acaoAtividade}%` });
    if (filtros.disciplina) qb.andWhere('itens.disciplina ILIKE :disc', { disc: `%${filtros.disciplina}%` });
    if (filtros.tipoSolicitacao) qb.andWhere('itens.tipo = :tipo', { tipo: filtros.tipoSolicitacao });

    const [dados, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: dados.map((s) => this.mapSolicitacao(this.aplicarRedacaoPorPapel(s, usuario))),
      total,
      page,
      pageSize,
    };
  }

  async buscarPorId(id: string, usuario: UsuarioAutenticado) {
    const solicitacao = await this.solicitacaoRepo.findOne({
      where: { id },
      relations: [
        'itens',
        'itens.devolutiva',
        'itens.areaPrograma',
        'itens.coordenadorResponsavel',
        'parceiro',
        'parceiro.presidente',
        'parceiro.coordenadorRegional',
        'mobilizador',
      ],
    });
    if (!solicitacao) throw new NotFoundException('Solicitação não encontrada.');
    this.assertAcesso(solicitacao, usuario);
    return this.mapSolicitacao(this.aplicarRedacaoPorPapel(solicitacao, usuario));
  }

  async historico(id: string, usuario: UsuarioAutenticado) {
    if (usuario.papel === Papel.MOBILIZADOR) {
      throw new ForbiddenException('Mobilizador não tem acesso ao histórico interno (HU01).');
    }
    const solicitacao = await this.buscarSolicitacaoOuFalhar(id);
    this.assertAcesso(solicitacao, usuario);
    const tramitacoes = await this.tramitacaoRepo.find({
      where: { solicitacaoId: id },
      order: { criadoEm: 'ASC' },
    });
    return tramitacoes.map((t) => ({
      id: t.id,
      de: t.deEtapa,
      para: t.paraEtapa,
      acao: t.acao,
      motivo: t.motivo,
      responsavelNome: t.usuarioNome,
      criadoEm: t.criadoEm,
    }));
  }

  /**
   * KPIs/dashboard — agregações reais sobre `solicitacoes`/`itens_solicitacao`, respeitando o
   * mesmo escopo de visibilidade por papel usado em `listar()`. Não acessível ao Mobilizador
   * (HU01 — métricas de tramitação interna não fazem parte da visão dele).
   */
  async metricas(usuario: UsuarioAutenticado, filtros: MetricasSolicitacoesDto) {
    if (usuario.papel === Papel.MOBILIZADOR) {
      throw new ForbiddenException('Mobilizador não tem acesso ao painel de métricas (HU01).');
    }

    const dataFim = filtros.dataFim ? new Date(filtros.dataFim) : new Date();
    const dataInicio = filtros.dataInicio
      ? new Date(filtros.dataInicio)
      : new Date(dataFim.getTime() - 30 * 24 * 60 * 60 * 1000);
    const duracaoMs = dataFim.getTime() - dataInicio.getTime();
    const dataInicioAnterior = new Date(dataInicio.getTime() - duracaoMs);
    const dataFimAnterior = new Date(dataInicio.getTime() - 1);

    const baseQb = () => {
      const qb = this.solicitacaoRepo
        .createQueryBuilder('s')
        .leftJoin('s.parceiro', 'parceiro')
        .leftJoin('s.itens', 'itens');
      this.aplicarEscopoPorPapel(qb, usuario);
      if (filtros.parceiroId) qb.andWhere('s.parceiroId = :parceiroId', { parceiroId: filtros.parceiroId });
      if (filtros.regionalId)
        qb.andWhere('parceiro.coordenadorRegionalId = :regionalId', { regionalId: filtros.regionalId });
      return qb;
    };

    const noPeriodo = (qb: ReturnType<typeof baseQb>, inicio: Date, fim: Date) =>
      qb.andWhere('s.dataSolicitacao BETWEEN :inicio AND :fim', { inicio, fim });

    // --- total e distribuição por status -------------------------------------------------
    const porStatusBruto = await noPeriodo(baseQb(), dataInicio, dataFim)
      .select('s.statusMacro', 'status')
      .addSelect('COUNT(DISTINCT s.id)', 'total')
      .groupBy('s.statusMacro')
      .getRawMany<{ status: StatusMacro; total: string }>();

    const totaisPorStatus = new Map(porStatusBruto.map((r) => [r.status, Number(r.total)]));
    const porStatus = Object.values(StatusMacro).map((status) => ({
      status,
      total: totaisPorStatus.get(status) ?? 0,
    }));
    const totalSolicitacoes = porStatus.reduce((soma, item) => soma + item.total, 0);

    const totalAtendido = totaisPorStatus.get(StatusMacro.ATENDIDO) ?? 0;
    const totalParcialmenteAtendido = totaisPorStatus.get(StatusMacro.PARCIALMENTE_ATENDIDO) ?? 0;
    const totalNaoAtendido = totaisPorStatus.get(StatusMacro.NAO_ATENDIDO) ?? 0;
    const totalCancelado = totaisPorStatus.get(StatusMacro.CANCELADO) ?? 0;
    const totalFinalizadas = STATUS_FINALIZADOS.reduce(
      (soma, status) => soma + (totaisPorStatus.get(status) ?? 0),
      0,
    );
    const totalEmAndamento = totalSolicitacoes - totalFinalizadas - totalCancelado;

    const taxaAtendimentoPercentual =
      totalFinalizadas > 0 ? Math.round((totalAtendido / totalFinalizadas) * 1000) / 10 : null;

    // --- SLA de ciência regional (HU02) --------------------------------------------------
    const slaBruto = await noPeriodo(baseQb(), dataInicio, dataFim)
      .select('COUNT(DISTINCT s.id)', 'totalComCiencia')
      .addSelect('COUNT(DISTINCT s.id) FILTER (WHERE s.cienciaAutomatica = true)', 'automaticas')
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (s.dataCienciaRegional - s.dataSolicitacao)) / 3600) FILTER (WHERE s.dataCienciaRegional IS NOT NULL)',
        'tempoMedioHoras',
      )
      .andWhere('s.dataCienciaRegional IS NOT NULL')
      .getRawOne<{ totalComCiencia: string; automaticas: string; tempoMedioHoras: string | null }>();

    const totalComCiencia = Number(slaBruto?.totalComCiencia ?? 0);
    const automaticas = Number(slaBruto?.automaticas ?? 0);

    // --- distribuição por tipo de item ----------------------------------------------------
    const porTipoItemBruto = await noPeriodo(baseQb(), dataInicio, dataFim)
      .select('itens.tipo', 'tipo')
      .addSelect('COUNT(itens.id)', 'total')
      .andWhere('itens.id IS NOT NULL')
      .groupBy('itens.tipo')
      .getRawMany<{ tipo: TipoItem; total: string }>();

    const totaisPorTipo = new Map(porTipoItemBruto.map((r) => [r.tipo, Number(r.total)]));
    const porTipoItem = Object.values(TipoItem).map((tipo) => ({
      tipo,
      total: totaisPorTipo.get(tipo) ?? 0,
    }));

    // --- distribuição por Área/Programa (apenas itens já direcionados) -------------------
    const porArea = await noPeriodo(baseQb(), dataInicio, dataFim)
      .leftJoin('itens.areaPrograma', 'area')
      .select('area.id', 'areaProgramaId')
      .addSelect('area.nome', 'nome')
      .addSelect('COUNT(itens.id)', 'total')
      .addSelect("COUNT(itens.id) FILTER (WHERE itens.statusItem = 'ATENDIDO')", 'atendidos')
      .addSelect(
        "COUNT(itens.id) FILTER (WHERE itens.statusItem = 'PARCIALMENTE_ATENDIDO')",
        'parciais',
      )
      .addSelect("COUNT(itens.id) FILTER (WHERE itens.statusItem = 'NAO_ATENDIDO')", 'naoAtendidos')
      .andWhere('area.id IS NOT NULL')
      .groupBy('area.id')
      .addGroupBy('area.nome')
      .orderBy('total', 'DESC')
      .getRawMany<{
        areaProgramaId: string;
        nome: string;
        total: string;
        atendidos: string;
        parciais: string;
        naoAtendidos: string;
      }>();

    // --- top Parceiros por volume ---------------------------------------------------------
    const porParceiro = await noPeriodo(baseQb(), dataInicio, dataFim)
      .select('parceiro.id', 'parceiroId')
      .addSelect('parceiro.sigla', 'nome')
      .addSelect('COUNT(DISTINCT s.id)', 'total')
      .groupBy('parceiro.id')
      .addGroupBy('parceiro.sigla')
      .orderBy('total', 'DESC')
      .limit(10)
      .getRawMany<{ parceiroId: string; nome: string; total: string }>();

    // --- série temporal (solicitações por dia no período) ---------------------------------
    const serieBruta = await noPeriodo(baseQb(), dataInicio, dataFim)
      .select("TO_CHAR(s.dataSolicitacao, 'YYYY-MM-DD')", 'data')
      .addSelect('COUNT(DISTINCT s.id)', 'total')
      .groupBy("TO_CHAR(s.dataSolicitacao, 'YYYY-MM-DD')")
      .orderBy('data', 'ASC')
      .getRawMany<{ data: string; total: string }>();

    // --- comparativo com o período anterior de igual duração -------------------------------
    const totalAnteriorBruto = await noPeriodo(baseQb(), dataInicioAnterior, dataFimAnterior)
      .select('COUNT(DISTINCT s.id)', 'total')
      .getRawOne<{ total: string }>();
    const totalAnterior = Number(totalAnteriorBruto?.total ?? 0);
    const variacaoPercentual =
      totalAnterior > 0
        ? Math.round(((totalSolicitacoes - totalAnterior) / totalAnterior) * 1000) / 10
        : null;

    return {
      periodo: { dataInicio: dataInicio.toISOString(), dataFim: dataFim.toISOString() },
      totalSolicitacoes,
      porStatus,
      totalAtendido,
      totalParcialmenteAtendido,
      totalNaoAtendido,
      totalCancelado,
      totalEmAndamento,
      taxaAtendimentoPercentual,
      slaCiencia: {
        totalComCiencia,
        automaticas,
        percentualAutomatica:
          totalComCiencia > 0 ? Math.round((automaticas / totalComCiencia) * 1000) / 10 : null,
        tempoMedioHoras: slaBruto?.tempoMedioHoras ? Math.round(Number(slaBruto.tempoMedioHoras) * 10) / 10 : null,
      },
      porTipoItem,
      porArea: porArea.map((a) => ({
        areaProgramaId: a.areaProgramaId,
        nome: a.nome,
        total: Number(a.total),
        atendidos: Number(a.atendidos),
        parciais: Number(a.parciais),
        naoAtendidos: Number(a.naoAtendidos),
      })),
      porParceiro: porParceiro.map((p) => ({ parceiroId: p.parceiroId, nome: p.nome, total: Number(p.total) })),
      serieTemporal: serieBruta.map((s) => ({ data: s.data, total: Number(s.total) })),
      comparativoPeriodoAnterior: {
        totalAtual: totalSolicitacoes,
        totalAnterior,
        variacaoPercentual,
      },
    };
  }

  // ------------------------------------------------------- transições (HU02–HU09)
  async darCiencia(id: string, usuario: UsuarioAutenticado) {
    this.exigirPapel(usuario, [Papel.COORDENADOR_REGIONAL, Papel.ADMIN]);
    const solicitacao = await this.buscarSolicitacaoOuFalhar(id);
    this.assertAcesso(solicitacao, usuario);
    await this.stateMachine.darCiencia(solicitacao, usuario, false);
    return this.buscarPorId(id, usuario);
  }

  async analisarAssessoria(id: string, usuario: UsuarioAutenticado, dto: AnaliseAssessoriaDto) {
    this.exigirPapel(usuario, [Papel.ASSESSOR, Papel.ADMIN]);
    const solicitacao = await this.buscarSolicitacaoOuFalhar(id);
    await this.stateMachine.analisarAssessoria(solicitacao, usuario, dto.decisao, dto.motivo);
    return this.buscarPorId(id, usuario);
  }

  async reenviarAposAjuste(id: string, usuario: UsuarioAutenticado) {
    this.exigirPapel(usuario, [Papel.MOBILIZADOR, Papel.ADMIN]);
    const solicitacao = await this.buscarSolicitacaoOuFalhar(id);
    this.assertAcesso(solicitacao, usuario);
    await this.stateMachine.reenviarAposAjuste(solicitacao, usuario);
    return this.buscarPorId(id, usuario);
  }

  async despacharSuperintendente(id: string, usuario: UsuarioAutenticado, dto: DespachoSuperintendenteDto) {
    this.exigirPapel(usuario, [Papel.SUPERINTENDENTE, Papel.ADMIN]);
    const solicitacao = await this.buscarSolicitacaoOuFalhar(id);
    await this.stateMachine.despacharSuperintendente(solicitacao, usuario, dto.diretoriaDestino);
    return this.buscarPorId(id, usuario);
  }

  async direcionarDiretor(id: string, usuario: UsuarioAutenticado, dto: DirecionamentoDiretorDto) {
    this.exigirPapel(usuario, [Papel.DIRETOR_EDUCACIONAL, Papel.ADMIN]);
    const solicitacao = await this.buscarSolicitacaoOuFalhar(id);
    const area = await this.areaProgramaRepo.findOne({ where: { id: dto.areaProgramaId } });
    if (!area) throw new NotFoundException('Área/Programa não encontrada.');

    await this.stateMachine.direcionarParaArea(
      solicitacao,
      usuario,
      dto.areaProgramaId,
      dto.coordenadorId,
      area.nome,
    );
    return this.buscarPorId(id, usuario);
  }

  async designarCoordenador(itemId: string, usuario: UsuarioAutenticado, dto: DesignarCoordenadorDto) {
    this.exigirPapel(usuario, [Papel.GESTOR, Papel.ADMIN]);
    const item = await this.buscarItemOuFalhar(itemId);
    const solicitacao = await this.buscarSolicitacaoOuFalhar(item.solicitacaoId);
    this.exigirMesmaArea(usuario, item.areaProgramaId);
    await this.stateMachine.designarCoordenadorNoItem(item, solicitacao, usuario, dto.coordenadorId);
    return this.buscarPorId(solicitacao.id, usuario);
  }

  async aceitarItem(itemId: string, usuario: UsuarioAutenticado) {
    this.exigirPapel(usuario, [Papel.COORDENADOR, Papel.ADMIN]);
    const item = await this.buscarItemOuFalhar(itemId);
    const solicitacao = await this.buscarSolicitacaoOuFalhar(item.solicitacaoId);
    await this.stateMachine.aceitarItem(item, solicitacao, usuario);
    return this.buscarPorId(solicitacao.id, usuario);
  }

  async encaminharItem(itemId: string, usuario: UsuarioAutenticado, dto: EncaminharItemDto) {
    this.exigirPapel(usuario, [Papel.COORDENADOR, Papel.ADMIN]);
    const item = await this.buscarItemOuFalhar(itemId);
    const solicitacao = await this.buscarSolicitacaoOuFalhar(item.solicitacaoId);
    const area = await this.areaProgramaRepo.findOne({ where: { id: dto.areaProgramaId } });
    if (!area) throw new NotFoundException('Área/Programa de destino não encontrada.');

    await this.stateMachine.encaminharItemParaOutraArea(
      item,
      solicitacao,
      usuario,
      dto.areaProgramaId,
      area.nome,
      dto.motivo,
    );
    return this.buscarPorId(solicitacao.id, usuario);
  }

  async registrarDevolutiva(itemId: string, usuario: UsuarioAutenticado, dto: RegistrarDevolutivaDto) {
    this.exigirPapel(usuario, [Papel.COORDENADOR, Papel.ADMIN]);
    const item = await this.buscarItemOuFalhar(itemId);
    const solicitacao = await this.buscarSolicitacaoOuFalhar(item.solicitacaoId);
    await this.stateMachine.registrarDevolutiva(item, solicitacao, usuario, dto);
    return this.buscarPorId(solicitacao.id, usuario);
  }

  // ------------------------------------------------------------ auxiliares
  private async gerarProximoNumeroDocumento(): Promise<string> {
    const ano = new Date().getFullYear();
    const total = await this.solicitacaoRepo.count();
    return `${String(total + 1).padStart(4, '0')}/${ano}`;
  }

  private async buscarSolicitacaoOuFalhar(id: string): Promise<Solicitacao> {
    const solicitacao = await this.solicitacaoRepo.findOne({ where: { id }, relations: ['itens'] });
    if (!solicitacao) throw new NotFoundException('Solicitação não encontrada.');
    return solicitacao;
  }

  private async buscarItemOuFalhar(itemId: string): Promise<ItemSolicitacao> {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item da solicitação não encontrado.');
    return item;
  }

  private exigirPapel(usuario: UsuarioAutenticado, permitidos: Papel[]): void {
    if (!permitidos.includes(usuario.papel)) {
      throw new ForbiddenException(`Papel "${usuario.papel}" não pode executar esta ação.`);
    }
  }

  private exigirMesmaArea(usuario: UsuarioAutenticado, areaProgramaId?: string): void {
    if (usuario.papel !== Papel.ADMIN && usuario.areaProgramaId !== areaProgramaId) {
      throw new ForbiddenException('Este item pertence a outra Área/Programa.');
    }
  }

  /** RBAC de leitura: cada papel só vê o subconjunto de solicitações pertinente. */
  private aplicarEscopoPorPapel(qb: ReturnType<Repository<Solicitacao>['createQueryBuilder']>, usuario: UsuarioAutenticado) {
    switch (usuario.papel) {
      case Papel.MOBILIZADOR:
        qb.andWhere('s.parceiroId = :parceiroId', { parceiroId: usuario.parceiroId });
        break;
      case Papel.COORDENADOR_REGIONAL:
        qb.andWhere('parceiro.coordenadorRegionalId = :coordenadorRegionalId', {
          coordenadorRegionalId: usuario.coordenadorRegionalId,
        });
        break;
      case Papel.GESTOR:
      case Papel.COORDENADOR:
        qb.andWhere('itens.areaProgramaId = :areaProgramaId', { areaProgramaId: usuario.areaProgramaId });
        break;
      // Assessor, Superintendente, Diretor Educacional e Admin têm visão ampla (toda a organização).
    }
    return qb;
  }

  private assertAcesso(solicitacao: Solicitacao, usuario: UsuarioAutenticado): void {
    if (usuario.papel === Papel.MOBILIZADOR && solicitacao.parceiroId !== usuario.parceiroId) {
      throw new ForbiddenException('Solicitação não pertence ao seu Parceiro.');
    }
  }

  /**
   * HU01 — regra crítica: o Mobilizador nunca recebe a etapa/tramitação interna,
   * apenas o status macro consolidado e a devolutiva final.
   */
  private aplicarRedacaoPorPapel(solicitacao: Solicitacao, usuario: UsuarioAutenticado): Solicitacao {
    if (usuario.papel !== Papel.MOBILIZADOR) {
      return solicitacao;
    }
    const copia = { ...solicitacao } as any;
    delete copia.etapaAtual;
    delete copia.motivoDevolucaoOuRecusa;
    delete copia.coordenadorDesignadoId;
    return copia;
  }

  /**
   * Achata as relações da Solicitação/Itens em campos "*Nome" para consumo direto
   * pelo frontend (ver api-contract.md e as telas de painel/detalhe da solicitação).
   */
  private mapSolicitacao(solicitacao: Solicitacao) {
    return {
      ...solicitacao,
      parceiroNome: solicitacao.parceiro?.sigla,
      presidenteNome: solicitacao.parceiro?.presidente?.nome,
      mobilizadorNome: solicitacao.mobilizador?.nome,
      coordenadorRegionalNome: solicitacao.parceiro?.coordenadorRegional?.nome,
      itens: solicitacao.itens?.map((item) => ({
        ...item,
        areaProgramaNome: item.areaPrograma?.nome,
        coordenadorId: item.coordenadorResponsavelId,
        coordenadorNome: item.coordenadorResponsavel?.nome,
      })),
    };
  }
}

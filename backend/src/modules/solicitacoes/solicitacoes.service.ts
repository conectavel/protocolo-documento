import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Brackets, In, Repository } from 'typeorm';
import { Solicitacao } from './entities/solicitacao.entity';
import { ItemSolicitacao } from './entities/item-solicitacao.entity';
import { Tramitacao } from './entities/tramitacao.entity';
import { AssinaturaDigital } from './entities/assinatura-digital.entity';
import { AreaPrograma } from '../parceiros/entities/area-programa.entity';
import { Parceiro } from '../parceiros/entities/parceiro.entity';
import { Mobilizador } from '../parceiros/entities/mobilizador.entity';
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
  EditarItemDto,
  EncaminharItemDto,
  ItemExcluidoDto,
  RegistrarDevolutivaDto,
} from './dto/transicoes.dto';
import { Papel, PAPEIS_INTERNOS, PAPEIS_PARCEIRO } from '../../common/enums/papel.enum';
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
    @InjectRepository(AssinaturaDigital) private readonly assinaturaRepo: Repository<AssinaturaDigital>,
    @InjectRepository(AreaPrograma) private readonly areaProgramaRepo: Repository<AreaPrograma>,
    @InjectRepository(Parceiro) private readonly parceiroRepo: Repository<Parceiro>,
    @InjectRepository(Mobilizador) private readonly mobilizadorRepo: Repository<Mobilizador>,
    private readonly anexosService: AnexosService,
    private readonly stateMachine: SolicitacaoStateMachineService,
  ) {}

  // ---------------------------------------------------------------- HU01
  async criar(
    dto: CriarSolicitacaoDto,
    usuario: UsuarioAutenticado,
    origemPreProtocolo?: { preProtocoloId: string; emailRemetente: string },
  ): Promise<Solicitacao> {
    if (PAPEIS_PARCEIRO.includes(usuario.papel) && usuario.parceiroId !== dto.parceiroId) {
      throw new ForbiddenException('Você só pode protocolar em nome do próprio Parceiro.');
    }
    // Mobilizador só pode protocolar como ele mesmo — 1 Parceiro tem 1 ou mais
    // Mobilizadores, então não basta pertencer ao mesmo Parceiro, tem que ser
    // o próprio usuário logado (Presidente, que não é ele mesmo um Mobilizador,
    // pode escolher qualquer um dos Mobilizadores do seu Parceiro).
    if (usuario.papel === Papel.MOBILIZADOR && usuario.mobilizadorId !== dto.mobilizadorId) {
      throw new ForbiddenException('Você só pode protocolar em seu próprio nome.');
    }

    const parceiro = await this.parceiroRepo.findOne({ where: { id: dto.parceiroId } });
    if (!parceiro) throw new NotFoundException('Parceiro não encontrado.');

    const mobilizador = await this.mobilizadorRepo.findOne({ where: { id: dto.mobilizadorId } });
    if (!mobilizador || mobilizador.parceiroId !== dto.parceiroId) {
      throw new ForbiddenException('O Mobilizador informado não pertence a este Parceiro.');
    }

    const agora = new Date();
    const solicitacao = this.solicitacaoRepo.create({
      parceiroId: dto.parceiroId,
      mobilizadorId: dto.mobilizadorId,
      municipio: dto.municipio,
      assunto: dto.assunto,
      numeroDocumento: dto.numeroDocumento ?? (await this.gerarProximoNumeroDocumento()),
      numeroProcesso: await this.gerarNumeroProcesso(agora),
      dataDocumento: dto.dataDocumento,
      observacao: dto.resumoObservacoes,
      urgencia: dto.urgencia,
      anexoOficioId: dto.anexoOficioId,
      dataSolicitacao: agora,
      prazoCienciaRegional: new Date(agora.getTime() + 24 * 60 * 60 * 1000),
      criadoPor: usuario.nome,
      alteradoPor: usuario.nome,
      preProtocoloOrigemId: origemPreProtocolo?.preProtocoloId ?? null,
      emailRemetenteOrigem: origemPreProtocolo?.emailRemetente ?? null,
      itens: dto.itens.map((item) =>
        this.itemRepo.create({
          ...item,
          // Retrato imutável do que o Mobilizador/Presidente preencheu — ver
          // ItemSolicitacao.valoresOriginais para o motivo de existir.
          valoresOriginais: {
            tipoEvento: item.tipoEvento,
            acaoAtividade: item.acaoAtividade,
            disciplina: item.disciplina,
            turno: item.turno,
            dataInicio: item.dataInicio,
            dataFim: item.dataFim,
          },
        })
      ),
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
    if (filtros.urgencia) qb.andWhere('s.urgencia = :urgencia', { urgencia: filtros.urgencia });
    if (filtros.parceiroId) qb.andWhere('s.parceiroId = :parceiroId', { parceiroId: filtros.parceiroId });
    if (filtros.numeroDocumento)
      qb.andWhere('s.numeroDocumento ILIKE :doc', { doc: `%${filtros.numeroDocumento}%` });
    if (filtros.numeroProcesso)
      qb.andWhere('s.numeroProcesso ILIKE :proc', { proc: `%${filtros.numeroProcesso}%` });
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

  /**
   * Contadores para os selos de cada aba do Painel de Ofícios: total por
   * StatusMacro (o frontend agrupa em aba via `abaDoStatusMacro`) e
   * "Meus Pendentes" — quantas solicitações/itens esperam uma ação deste
   * usuário especificamente, espelhando exatamente a mesma regra de
   * `podeTramitar()` do painel (ver painel-oficios.component.ts), por papel.
   */
  async contadores(usuario: UsuarioAutenticado) {
    // `aplicarEscopoPorPapel` referencia o alias `itens` para Gestor/Coordenador
    // (escopo por Área/Programa) — precisa existir mesmo aqui, onde não usamos
    // os itens para nada além de satisfazer esse join.
    const qbStatus = this.solicitacaoRepo
      .createQueryBuilder('s')
      .leftJoin('s.parceiro', 'parceiro')
      .leftJoin('s.itens', 'itens');
    this.aplicarEscopoPorPapel(qbStatus, usuario);
    const porStatusBruto = await qbStatus
      .select('s.statusMacro', 'status')
      .addSelect('COUNT(DISTINCT s.id)', 'total')
      .groupBy('s.statusMacro')
      .getRawMany<{ status: StatusMacro; total: string }>();

    const porStatus: Record<string, number> = {};
    for (const linha of porStatusBruto) {
      porStatus[linha.status] = Number(linha.total);
    }

    return { porStatus, meusPendentes: await this.contarMeusPendentes(usuario) };
  }

  private async contarMeusPendentes(usuario: UsuarioAutenticado): Promise<number> {
    switch (usuario.papel) {
      case Papel.COORDENADOR_REGIONAL: {
        const qb = this.solicitacaoRepo.createQueryBuilder('s').leftJoin('s.parceiro', 'parceiro');
        this.aplicarEscopoPorPapel(qb, usuario);
        qb.andWhere('s.statusMacro = :status', { status: StatusMacro.EM_ANALISE_REGIONAL });
        return qb.getCount();
      }
      case Papel.ASSESSOR: {
        const qb = this.solicitacaoRepo.createQueryBuilder('s').leftJoin('s.parceiro', 'parceiro');
        this.aplicarEscopoPorPapel(qb, usuario);
        qb.andWhere('s.statusMacro = :status', { status: StatusMacro.EM_ANALISE_ASSESSORIA });
        return qb.getCount();
      }
      case Papel.SUPERINTENDENTE:
      case Papel.DIRETOR_EDUCACIONAL: {
        const qb = this.solicitacaoRepo.createQueryBuilder('s').leftJoin('s.parceiro', 'parceiro');
        this.aplicarEscopoPorPapel(qb, usuario);
        qb.andWhere('s.statusMacro = :status', { status: StatusMacro.EM_DESPACHO });
        return qb.getCount();
      }
      case Papel.GESTOR: {
        const qb = this.solicitacaoRepo
          .createQueryBuilder('s')
          .leftJoin('s.parceiro', 'parceiro')
          .innerJoin('s.itens', 'itens')
          .leftJoin('itens.devolutiva', 'devolutiva');
        this.aplicarEscopoPorPapel(qb, usuario);
        qb.andWhere('itens.areaProgramaId = :areaId', { areaId: usuario.areaProgramaId })
          .andWhere('itens.coordenadorResponsavelId IS NULL')
          .andWhere('devolutiva.id IS NULL');
        const resultado = await qb.select('COUNT(DISTINCT s.id)', 'total').getRawOne<{ total: string }>();
        return Number(resultado?.total ?? 0);
      }
      case Papel.COORDENADOR: {
        const qb = this.solicitacaoRepo
          .createQueryBuilder('s')
          .leftJoin('s.parceiro', 'parceiro')
          .innerJoin('s.itens', 'itens')
          .leftJoin('itens.devolutiva', 'devolutiva');
        this.aplicarEscopoPorPapel(qb, usuario);
        qb.andWhere('itens.coordenadorResponsavelId = :uid', { uid: usuario.id }).andWhere(
          'devolutiva.id IS NULL',
        );
        const resultado = await qb.select('COUNT(DISTINCT s.id)', 'total').getRawOne<{ total: string }>();
        return Number(resultado?.total ?? 0);
      }
      case Papel.MOBILIZADOR:
      case Papel.PRESIDENTE: {
        const qb = this.solicitacaoRepo.createQueryBuilder('s').leftJoin('s.parceiro', 'parceiro');
        this.aplicarEscopoPorPapel(qb, usuario);
        qb.andWhere('s.statusMacro = :status', { status: StatusMacro.DEVOLVIDO_AJUSTE });
        return qb.getCount();
      }
      default:
        return 0;
    }
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
    if (PAPEIS_PARCEIRO.includes(usuario.papel)) {
      throw new ForbiddenException('Você não tem acesso ao histórico interno (HU01).');
    }
    const solicitacao = await this.buscarSolicitacaoOuFalhar(id);
    this.assertAcesso(solicitacao, usuario);
    const tramitacoes = await this.tramitacaoRepo.find({
      where: { solicitacaoId: id },
      order: { criadoEm: 'ASC' },
    });
    const assinaturas = tramitacoes.length
      ? await this.assinaturaRepo.find({ where: { tramitacaoId: In(tramitacoes.map((t) => t.id)) } })
      : [];
    const assinaturaPorTramitacao = new Map(assinaturas.map((a) => [a.tramitacaoId, a]));

    return tramitacoes.map((t) => {
      const assinatura = assinaturaPorTramitacao.get(t.id);
      return {
        id: t.id,
        de: t.deEtapa,
        para: t.paraEtapa,
        acao: t.acao,
        motivo: t.motivo,
        responsavelNome: t.usuarioNome,
        responsavelPapel: t.usuarioPapel,
        criadoEm: t.criadoEm,
        assinatura: assinatura
          ? {
              tipo: assinatura.tipo,
              imagemAssinatura: assinatura.imagemAssinatura,
              certificadoNomeArquivo: assinatura.certificadoNomeArquivo,
              titularCertificado: assinatura.titularCertificado,
              validada: assinatura.validada,
              avisoValidade: assinatura.avisoValidade,
              assinadoEm: assinatura.assinadoEm,
            }
          : null,
      };
    });
  }

  /**
   * Aba "Anexos" do detalhe — todos os documentos que compõem o processo.
   * Regra HU01: a visualização do Mobilizador/Presidente fica restrita ao
   * status e à devolutiva final; esta aba (assim como "Aprovações"/histórico)
   * não faz parte do que "volta" para eles — o próprio ofício que enviaram já
   * aparece embutido na aba "Processo".
   */
  async listarAnexos(id: string, usuario: UsuarioAutenticado) {
    if (PAPEIS_PARCEIRO.includes(usuario.papel)) {
      throw new ForbiddenException('Você não tem acesso à lista de anexos internos (HU01).');
    }
    const solicitacao = await this.buscarSolicitacaoOuFalhar(id);
    this.assertAcesso(solicitacao, usuario);
    const anexos = await this.anexosService.listarPorSolicitacao(id);
    return anexos.map((a) => ({
      id: a.id,
      nomeArquivo: a.nomeArquivo,
      tipo: a.tipo,
      tamanhoBytes: a.tamanhoBytes,
      mimeType: a.mimeType,
      enviadoPor: a.enviadoPor,
      enviadoEm: a.enviadoEm,
    }));
  }

  /**
   * KPIs/dashboard — agregações reais sobre `solicitacoes`/`itens_solicitacao`, respeitando o
   * mesmo escopo de visibilidade por papel usado em `listar()`. Não acessível aos papéis de
   * Parceiro (Mobilizador/Presidente) — HU01, métricas de tramitação interna não fazem
   * parte da visão deles.
   */
  async metricas(usuario: UsuarioAutenticado, filtros: MetricasSolicitacoesDto) {
    if (PAPEIS_PARCEIRO.includes(usuario.papel)) {
      throw new ForbiddenException('Você não tem acesso ao painel de métricas (HU01).');
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
      if (filtros.mobilizadorId)
        qb.andWhere('s.mobilizadorId = :mobilizadorId', { mobilizadorId: filtros.mobilizadorId });
      if (filtros.tipoSolicitacao)
        qb.andWhere('itens.tipo = :tipoSolicitacao', { tipoSolicitacao: filtros.tipoSolicitacao });
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

    // --- SLA de ciência por Coordenador Regional (identificar como cada um está atuando) —
    // só faz sentido comparar coordenadores para quem enxerga mais de um; o próprio
    // Coordenador Regional já só vê os próprios dados (aplicarEscopoPorPapel), então para
    // ele omitimos esta comparação por completo (ver retorno abaixo).
    let porCoordenadorRegional: {
      coordenadorRegionalId: string;
      nome: string;
      total: number;
      dentroPrazo: number;
      automaticas: number;
      percentualDentroPrazo: number | null;
      tempoMedioHoras: number | null;
    }[] = [];

    if (usuario.papel !== Papel.COORDENADOR_REGIONAL) {
      const porCrBruto = await noPeriodo(baseQb(), dataInicio, dataFim)
        .leftJoin('parceiro.coordenadorRegional', 'coordenadorRegional')
        .select('coordenadorRegional.id', 'coordenadorRegionalId')
        .addSelect('coordenadorRegional.nome', 'nome')
        .addSelect('COUNT(DISTINCT s.id)', 'total')
        .addSelect(
          'COUNT(DISTINCT s.id) FILTER (WHERE s.cienciaAutomatica = true)',
          'automaticas',
        )
        .addSelect(
          'AVG(EXTRACT(EPOCH FROM (s.dataCienciaRegional - s.dataSolicitacao)) / 3600)',
          'tempoMedioHoras',
        )
        .andWhere('s.dataCienciaRegional IS NOT NULL')
        .andWhere('coordenadorRegional.id IS NOT NULL')
        .groupBy('coordenadorRegional.id')
        .addGroupBy('coordenadorRegional.nome')
        .orderBy('total', 'DESC')
        .getRawMany<{
          coordenadorRegionalId: string;
          nome: string;
          total: string;
          automaticas: string;
          tempoMedioHoras: string | null;
        }>();

      porCoordenadorRegional = porCrBruto.map((cr) => {
        const total = Number(cr.total);
        const automaticasCr = Number(cr.automaticas);
        return {
          coordenadorRegionalId: cr.coordenadorRegionalId,
          nome: cr.nome,
          total,
          dentroPrazo: total - automaticasCr,
          automaticas: automaticasCr,
          percentualDentroPrazo: total > 0 ? Math.round(((total - automaticasCr) / total) * 1000) / 10 : null,
          tempoMedioHoras: cr.tempoMedioHoras ? Math.round(Number(cr.tempoMedioHoras) * 10) / 10 : null,
        };
      });
    }

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
        /**
         * Comparativo entre Coordenadores Regionais — quem deu ciência dentro do prazo
         * vs. quem estourou o SLA de 24h e teve avanço automático. Omitido (array vazio)
         * quando o próprio Coordenador Regional está vendo o dashboard: ele já enxerga
         * só os próprios dados (aplicarEscopoPorPapel) e não deve comparar com colegas.
         */
        porCoordenadorRegional,
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
    await this.stateMachine.analisarAssessoria(solicitacao, usuario, dto.decisao, dto.motivo, dto.assinatura);
    if (dto.decisao === 'APROVAR') {
      await this.excluirItensDoFluxo(solicitacao, usuario, dto.itensExcluidos);
    }
    return this.buscarPorId(id, usuario);
  }

  async reenviarAposAjuste(id: string, usuario: UsuarioAutenticado) {
    this.exigirPapel(usuario, [...PAPEIS_PARCEIRO, Papel.ADMIN]);
    const solicitacao = await this.buscarSolicitacaoOuFalhar(id);
    this.assertAcesso(solicitacao, usuario);
    await this.stateMachine.reenviarAposAjuste(solicitacao, usuario);
    return this.buscarPorId(id, usuario);
  }

  async despacharSuperintendente(id: string, usuario: UsuarioAutenticado, dto: DespachoSuperintendenteDto) {
    this.exigirPapel(usuario, [Papel.SUPERINTENDENTE, Papel.ADMIN]);
    const solicitacao = await this.buscarSolicitacaoOuFalhar(id);
    await this.stateMachine.despacharSuperintendente(
      solicitacao,
      usuario,
      dto.diretoriaDestino,
      dto.diretoresIds,
      dto.assinatura,
    );
    await this.excluirItensDoFluxo(solicitacao, usuario, dto.itensExcluidos);
    return this.buscarPorId(id, usuario);
  }

  /**
   * A Assessoria (ao aprovar) e o Superintendente (ao despachar) podem marcar
   * itens que não vão avançar pelo fluxo das áreas — cada um vira
   * "Parcialmente Atendido" automaticamente, com uma devolutiva que usa a
   * observação escrita por quem excluiu (ou uma mensagem padrão, se em branco).
   */
  private async excluirItensDoFluxo(
    solicitacao: Solicitacao,
    usuario: UsuarioAutenticado,
    itensExcluidos: ItemExcluidoDto[] | undefined,
  ): Promise<void> {
    for (const { itemId, observacao, resultado } of itensExcluidos ?? []) {
      const item = await this.buscarItemOuFalhar(itemId);
      await this.stateMachine.excluirItemDoFluxo(item, solicitacao, usuario, observacao, resultado);
    }
  }

  /** HU05 — direciona UM item específico; só um dos Diretores designados no despacho pode agir. */
  async direcionarItem(itemId: string, usuario: UsuarioAutenticado, dto: DirecionamentoDiretorDto) {
    this.exigirPapel(usuario, [Papel.DIRETOR_EDUCACIONAL, Papel.ADMIN]);
    const item = await this.buscarItemOuFalhar(itemId);
    const solicitacao = await this.buscarSolicitacaoOuFalhar(item.solicitacaoId);
    this.exigirDiretorDesignado(usuario, solicitacao);

    const area = await this.areaProgramaRepo.findOne({ where: { id: dto.areaProgramaId } });
    if (!area) throw new NotFoundException('Área/Programa não encontrada.');

    await this.stateMachine.direcionarItemParaArea(
      item,
      solicitacao,
      usuario,
      dto.areaProgramaId,
      dto.coordenadorId,
      area.nome,
      dto.observacao,
    );
    return this.buscarPorId(solicitacao.id, usuario);
  }

  /** "Análise e Providência" — Diretor confirma que terminou de direcionar todos os itens. */
  async confirmarDirecionamento(id: string, usuario: UsuarioAutenticado) {
    this.exigirPapel(usuario, [Papel.DIRETOR_EDUCACIONAL, Papel.ADMIN]);
    const solicitacao = await this.buscarSolicitacaoOuFalhar(id);
    this.exigirDiretorDesignado(usuario, solicitacao);
    await this.stateMachine.confirmarDirecionamento(solicitacao, usuario);
    return this.buscarPorId(solicitacao.id, usuario);
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

  /** O Coordenador corrige os campos preenchidos pelo Mobilizador/Presidente — o original fica em histórico. */
  async editarItem(itemId: string, usuario: UsuarioAutenticado, dto: EditarItemDto) {
    this.exigirPapel(usuario, [Papel.COORDENADOR, Papel.ADMIN]);
    const item = await this.buscarItemOuFalhar(itemId);
    const solicitacao = await this.buscarSolicitacaoOuFalhar(item.solicitacaoId);
    await this.stateMachine.editarItem(item, solicitacao, usuario, dto);
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

  /**
   * Número de Processo — identificador único e destacado de todo protocolo,
   * no formato AAAAMMDD + sequência do dia (ex.: 20260902001 = 2º/set/2026,
   * 1º protocolo daquele dia). Diferente de `numeroDocumento` (o número do
   * ofício em si, que o próprio Mobilizador pode informar).
   */
  private async gerarNumeroProcesso(agora: Date): Promise<string> {
    const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicioDiaSeguinte = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
    const totalHoje = await this.solicitacaoRepo.count({
      where: { criadoEm: Between(inicioDia, inicioDiaSeguinte) },
    });
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    const sequencia = String(totalHoje + 1).padStart(3, '0');
    return `${ano}${mes}${dia}${sequencia}`;
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

  /**
   * Identidades efetivas do usuário para fins de RBAC: a própria mais, quando aplicável,
   * uma substituição vigente (ver SubstituicoesService) — o substituto herda os direitos
   * do substituído sem perder os próprios, pelo período da substituição.
   */
  private identidadesEfetivas(usuario: UsuarioAutenticado) {
    return [
      {
        papel: usuario.papel,
        areaProgramaId: usuario.areaProgramaId,
        areasProgramaIds: usuario.areasProgramaIds,
        parceiroId: usuario.parceiroId,
        coordenadorRegionalId: usuario.coordenadorRegionalId,
      },
      ...(usuario.substituindo ?? []),
    ];
  }

  /**
   * Todas as Áreas/Programa que uma identidade pode atender — um Coordenador
   * pode ter mais de uma hoje (Usuario.areasProgramaIds); onde estiver vazio
   * (usuários ainda não migrados), cai de volta na área única de sempre.
   */
  private areasEfetivas(identidade: { areaProgramaId?: string; areasProgramaIds?: string[] }): string[] {
    if (identidade.areasProgramaIds?.length) {
      return identidade.areasProgramaIds;
    }
    return identidade.areaProgramaId ? [identidade.areaProgramaId] : [];
  }

  private exigirPapel(usuario: UsuarioAutenticado, permitidos: Papel[]): void {
    const temPermissao = this.identidadesEfetivas(usuario).some((id) => permitidos.includes(id.papel));
    if (!temPermissao) {
      throw new ForbiddenException(`Papel "${usuario.papel}" não pode executar esta ação.`);
    }
  }

  private exigirMesmaArea(usuario: UsuarioAutenticado, areaProgramaId?: string): void {
    if (usuario.papel === Papel.ADMIN) return;
    const temAcesso = this.identidadesEfetivas(usuario).some((id) =>
      this.areasEfetivas(id).includes(areaProgramaId ?? '')
    );
    if (!temAcesso) {
      throw new ForbiddenException('Este item pertence a outra Área/Programa.');
    }
  }

  /**
   * HU04/HU05 — só os Diretores explicitamente escolhidos pelo Superintendente
   * no despacho podem direcionar os itens desta solicitação (`identidadesEfetivas`
   * não serve aqui porque a designação é por solicitação, não por papel/área).
   */
  private exigirDiretorDesignado(usuario: UsuarioAutenticado, solicitacao: Solicitacao): void {
    if (usuario.papel === Papel.ADMIN) return;
    const designados = solicitacao.diretoresDesignadosIds ?? [];
    const idsEfetivos = [usuario.id, ...(usuario.substituindo ?? []).map((sub) => sub.usuarioId)];
    const temAcesso = idsEfetivos.some((id) => designados.includes(id));
    if (!temAcesso) {
      throw new ForbiddenException('Você não foi designado como Diretor responsável por esta solicitação.');
    }
  }

  /** RBAC de leitura: cada papel só vê o subconjunto de solicitações pertinente. */
  private aplicarEscopoPorPapel(qb: ReturnType<Repository<Solicitacao>['createQueryBuilder']>, usuario: UsuarioAutenticado) {
    const identidades = this.identidadesEfetivas(usuario);

    if (identidades.some((id) => [Papel.ASSESSOR, Papel.SUPERINTENDENTE, Papel.DIRETOR_EDUCACIONAL, Papel.ADMIN].includes(id.papel))) {
      return qb; // visão ampla (toda a organização) por qualquer identidade efetiva
    }

    qb.andWhere(
      new Brackets((sub) => {
        identidades.forEach((id, indice) => {
          if (PAPEIS_PARCEIRO.includes(id.papel)) {
            sub.orWhere(`s.parceiroId = :parceiroId${indice}`, { [`parceiroId${indice}`]: id.parceiroId });
          } else if (id.papel === Papel.COORDENADOR_REGIONAL) {
            sub.orWhere(`parceiro.coordenadorRegionalId = :coordenadorRegionalId${indice}`, {
              [`coordenadorRegionalId${indice}`]: id.coordenadorRegionalId,
            });
          } else if (id.papel === Papel.GESTOR || id.papel === Papel.COORDENADOR) {
            const areas = this.areasEfetivas(id);
            if (areas.length > 0) {
              sub.orWhere(`itens.areaProgramaId IN (:...areaProgramaIds${indice})`, {
                [`areaProgramaIds${indice}`]: areas,
              });
            }
          }
        });
      }),
    );
    return qb;
  }

  private assertAcesso(solicitacao: Solicitacao, usuario: UsuarioAutenticado): void {
    const permitido = this.identidadesEfetivas(usuario).some(
      (id) => !PAPEIS_PARCEIRO.includes(id.papel) || solicitacao.parceiroId === id.parceiroId,
    );
    if (!permitido) {
      throw new ForbiddenException('Solicitação não pertence ao seu Parceiro.');
    }
  }

  /**
   * HU01 — regra crítica: Mobilizador e Presidente (mesma autonomia) nunca recebem a
   * etapa/tramitação interna, apenas o status macro consolidado e a devolutiva final.
   */
  private aplicarRedacaoPorPapel(solicitacao: Solicitacao, usuario: UsuarioAutenticado): Solicitacao {
    if (!PAPEIS_PARCEIRO.includes(usuario.papel)) {
      return solicitacao;
    }
    const copia = { ...solicitacao } as any;
    delete copia.etapaAtual;
    delete copia.motivoDevolucaoOuRecusa;
    delete copia.coordenadorDesignadoId;
    delete copia.diretoresDesignadosIds;
    return copia;
  }

  /**
   * Achata as relações da Solicitação/Itens em campos "*Nome" para consumo direto
   * pelo frontend (ver api-contract.md e as telas de painel/detalhe da solicitação).
   */
  private mapSolicitacao(solicitacao: Solicitacao) {
    return {
      ...solicitacao,
      // A coluna no banco chama "observacao" (herdada do desenho inicial), mas o
      // contrato com o frontend usa "resumoObservacoes" — sem isso, o Resumo /
      // Observações preenchido pelo Mobilizador/Presidente nunca aparece na tela.
      resumoObservacoes: solicitacao.observacao,
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

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PdfViewerDialogComponent } from '../../shared/components/pdf-viewer-dialog/pdf-viewer-dialog.component';

import { AuthService } from '../../core/services/auth.service';
import { ParceirosService } from '../../core/services/parceiros.service';
import { SolicitacoesService } from '../../core/services/solicitacoes.service';
import {
  AbaPainel,
  AreaPrograma,
  Contadores,
  CoordenadorRegional,
  PAPEIS_PARCEIRO,
  Parceiro,
  Solicitacao,
  STATUS_MACRO_LABELS,
  StatusMacro,
  TIPO_ITEM_LABELS,
  TipoItem,
  URGENCIA_LABELS,
  Urgencia,
  abaDoStatusMacro,
  chipTomUrgencia,
} from '../../core/models';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

interface AbaConfig {
  chave: AbaPainel;
  rotulo: string;
  somenteInterno?: boolean;
}

const ABAS: AbaConfig[] = [
  { chave: 'MEUS_PENDENTES', rotulo: 'Meus Pendentes' },
  { chave: 'INICIADOS', rotulo: 'Iniciados' },
  { chave: 'DESPACHO', rotulo: 'Despacho', somenteInterno: true },
  { chave: 'ATENDIDOS', rotulo: 'Atendidos' },
  { chave: 'PARCIALMENTE', rotulo: 'Parcialmente' },
  { chave: 'NAO_ATENDIDOS', rotulo: 'Não Atendidos' },
  { chave: 'CANCELADOS', rotulo: 'Cancelados' },
];

/** Quais StatusMacro somam no selo de cada aba — espelha abaDoStatusMacro(), na direção inversa. */
const STATUS_POR_ABA: Partial<Record<AbaPainel, StatusMacro[]>> = {
  INICIADOS: ['EM_ANALISE_REGIONAL', 'EM_ANALISE_ASSESSORIA', 'DEVOLVIDO_AJUSTE', 'EM_EXECUCAO'],
  DESPACHO: ['EM_DESPACHO'],
  ATENDIDOS: ['ATENDIDO'],
  PARCIALMENTE: ['PARCIALMENTE_ATENDIDO'],
  NAO_ATENDIDOS: ['NAO_ATENDIDO'],
  CANCELADOS: ['CANCELADO'],
};

/** Status em que a solicitação ainda está "em tramitação" — faz sentido mostrar o botão. */
const STATUS_EM_ANDAMENTO: StatusMacro[] = [
  'EM_ANALISE_REGIONAL',
  'EM_ANALISE_ASSESSORIA',
  'DEVOLVIDO_AJUSTE',
  'EM_DESPACHO',
  'EM_EXECUCAO',
];

/**
 * Painel de Protocolo de Ofício — Template 4 (lista) da spec visual.
 *
 * Regra HU01: o backend nunca envia `etapaAtual`/`tramitacoes` para o
 * papel MOBILIZADOR. Este componente NÃO reimplementa essa ocultação —
 * apenas usa `@if` para não quebrar quando os campos vierem ausentes.
 */
@Component({
  selector: 'app-painel-oficios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatDatepickerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSelectModule,
    MatTooltipModule,
    StatusChipComponent,
    EmptyStateComponent,
    LoadingStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './painel-oficios.component.html',
  styleUrl: './painel-oficios.component.scss',
})
export class PainelOficiosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly solicitacoesService = inject(SolicitacoesService);
  private readonly parceirosService = inject(ParceirosService);
  private readonly dialog = inject(MatDialog);

  readonly tiposItem: TipoItem[] = ['ACAO_ATIVIDADE', 'PATROCINIO', 'SOLICITACAO_ITENS', 'CONVITE'];
  readonly tipoItemLabels = TIPO_ITEM_LABELS;

  readonly carregando = signal(false);
  readonly solicitacoes = signal<Solicitacao[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly modoTabela = signal(false);
  readonly abaAtiva = signal<AbaPainel>('MEUS_PENDENTES');
  readonly busca = signal('');
  readonly contadores = signal<Contadores | null>(null);

  readonly parceiros = signal<Parceiro[]>([]);
  readonly regionais = signal<CoordenadorRegional[]>([]);
  readonly areasPrograma = signal<AreaPrograma[]>([]);

  readonly papel = computed(() => this.auth.papel());
  // Presidente do Sindicato tem a mesma autonomia do Mobilizador (pedido do cliente).
  readonly ehMobilizador = computed(() => {
    const papel = this.papel();
    return !!papel && PAPEIS_PARCEIRO.includes(papel);
  });
  // Assessor tem autonomia para protocolar diretamente em nome de um Parceiro —
  // útil quando o ofício chega em mãos, não por e-mail (não passa pelo Pré Protocolo).
  readonly ehAssessor = computed(() => this.papel() === 'ASSESSOR');
  readonly abasVisiveis = computed(() =>
    ABAS.filter((aba) => !aba.somenteInterno || !this.ehMobilizador())
  );

  readonly solicitacoesDaAba = computed(() => {
    const aba = this.abaAtiva();
    if (aba === 'MEUS_PENDENTES') {
      return this.solicitacoes().filter((s) => this.podeTramitar(s));
    }
    return this.solicitacoes().filter((s) => abaDoStatusMacro(s.statusMacro) === aba);
  });

  /** Total do selo de cada aba — "Meus Pendentes" vem de contadores().meusPendentes; as demais somam por StatusMacro. */
  contadorDaAba(aba: AbaPainel): number {
    const c = this.contadores();
    if (!c) return 0;
    if (aba === 'MEUS_PENDENTES') return c.meusPendentes;
    const statusList = STATUS_POR_ABA[aba] ?? [];
    return statusList.reduce((soma, status) => soma + (c.porStatus[status] ?? 0), 0);
  }

  // Busca livre: filtra pelos mesmos campos exibidos no card/tabela (título,
  // documento, parceiro, município, mobilizador, status) — client-side sobre a
  // página já carregada, já que a API não expõe um filtro de texto livre
  // multi-campo (só `numeroDocumento`, usado pelo filtro avançado).
  readonly solicitacoesFiltradas = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const base = this.solicitacoesDaAba();
    if (!termo) return base;
    return base.filter((s) =>
      [
        s.assunto,
        s.numeroDocumento,
        s.parceiroNome,
        s.municipio,
        s.mobilizadorNome,
        s.presidenteNome,
        s.coordenadorRegionalNome,
        STATUS_MACRO_LABELS[s.statusMacro],
      ].some((campo) => campo?.toLowerCase().includes(termo))
    );
  });

  readonly filtros = this.fb.nonNullable.group({
    parceiroId: [''],
    regionalId: [''],
    tipoSolicitacao: [''],
    acaoAtividade: [''],
    disciplina: [''],
    numeroDocumento: [''],
    numeroProcesso: [''],
    urgencia: [''],
    dataInicio: [null as Date | null],
    dataFim: [null as Date | null],
  });

  readonly urgencias: Urgencia[] = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'];
  readonly urgenciaLabels = URGENCIA_LABELS;
  readonly chipTomUrgencia = chipTomUrgencia;

  /** Chip de urgência clicável junto do paginador — atalho para o mesmo filtro do painel acima. */
  selecionarUrgencia(urgencia: Urgencia | ''): void {
    this.filtros.controls.urgencia.setValue(urgencia);
    this.filtrar();
  }

  ngOnInit(): void {
    this.carregarFiltrosAuxiliares();
    this.carregarContadores();
    this.carregar();
  }

  private carregarContadores(): void {
    this.solicitacoesService.contadores().subscribe({
      next: (c) => this.contadores.set(c),
      error: () => this.contadores.set(null),
    });
  }

  carregarFiltrosAuxiliares(): void {
    this.parceirosService.listar(undefined, 1, 100).subscribe({
      next: (pagina) => this.parceiros.set(pagina.data),
      error: () => this.parceiros.set([]),
    });
    this.parceirosService.listarCoordenadoresRegionais().subscribe({
      next: (lista) => this.regionais.set(lista),
      error: () => this.regionais.set([]),
    });
    this.parceirosService.listarAreasPrograma().subscribe({
      next: (lista) => this.areasPrograma.set(lista),
      error: () => this.areasPrograma.set([]),
    });
  }

  carregar(): void {
    this.carregando.set(true);
    const valores = this.filtros.getRawValue();

    // Observação: o contrato de API (GET /api/solicitacoes) não expõe um
    // campo de busca livre nem múltiplos status por requisição — por isso
    // o agrupamento por aba (que reúne vários StatusMacro) e a busca livre
    // (`solicitacoesFiltradas`, acima) são aplicados no cliente sobre a
    // página retornada. `numeroDocumento` aqui é só o filtro avançado do
    // formulário — a busca rápida acima do painel não é enviada ao backend.
    this.solicitacoesService
      .listar({
        parceiroId: valores.parceiroId || undefined,
        regionalId: valores.regionalId || undefined,
        tipoSolicitacao: (valores.tipoSolicitacao as TipoItem) || undefined,
        acaoAtividade: valores.acaoAtividade || undefined,
        disciplina: valores.disciplina || undefined,
        numeroDocumento: valores.numeroDocumento || undefined,
        numeroProcesso: valores.numeroProcesso || undefined,
        urgencia: (valores.urgencia as Urgencia) || undefined,
        dataInicio: valores.dataInicio ? valores.dataInicio.toISOString() : undefined,
        dataFim: valores.dataFim ? valores.dataFim.toISOString() : undefined,
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: (pagina) => {
          this.solicitacoes.set(pagina.data);
          this.total.set(pagina.total);
          this.carregando.set(false);
        },
        error: () => {
          this.solicitacoes.set([]);
          this.total.set(0);
          this.carregando.set(false);
        },
      });
  }

  filtrar(): void {
    this.page.set(1);
    this.carregar();
  }

  limparFiltros(): void {
    this.filtros.reset({
      parceiroId: '',
      regionalId: '',
      tipoSolicitacao: '',
      acaoAtividade: '',
      disciplina: '',
      numeroDocumento: '',
      numeroProcesso: '',
      urgencia: '',
      dataInicio: null,
      dataFim: null,
    });
    this.busca.set('');
    this.filtrar();
  }

  selecionarAba(aba: AbaPainel): void {
    this.abaAtiva.set(aba);
  }

  alternarVisualizacao(): void {
    this.modoTabela.update((valor) => !valor);
  }

  aoMudarPagina(evento: PageEvent): void {
    this.page.set(evento.pageIndex + 1);
    this.pageSize.set(evento.pageSize);
    this.carregar();
  }

  contarItensPorTipo(solicitacao: Solicitacao, tipo: TipoItem): number {
    return solicitacao.itens.filter((item) => item.tipo === tipo).length;
  }

  /** A solicitação ainda está correndo pelo fluxo (nem finalizada, nem cancelada). */
  emTramitacao(solicitacao: Solicitacao): boolean {
    return STATUS_EM_ANDAMENTO.includes(solicitacao.statusMacro);
  }

  /**
   * Se o usuário logado tem uma ação pendente NESTA solicitação agora — espelha,
   * de forma simplificada, as mesmas condições usadas no Detalhe da Solicitação
   * (podeDarCiencia/podeAnalisarAssessoria/podeDespachar/podeDirecionar e as
   * verificações por item de Gestor/Coordenador) para decidir se o botão do
   * card deve chamar para ação ("Realizar Tramitação") ou só indicar que o
   * processo está em andamento com outra pessoa ("Em Tramitação").
   */
  podeTramitar(solicitacao: Solicitacao): boolean {
    const papel = this.papel();
    if (!papel) return false;
    const usuario = this.auth.usuario();

    switch (papel) {
      case 'COORDENADOR_REGIONAL':
        return solicitacao.statusMacro === 'EM_ANALISE_REGIONAL';
      case 'ASSESSOR':
        return solicitacao.statusMacro === 'EM_ANALISE_ASSESSORIA';
      case 'SUPERINTENDENTE':
      case 'DIRETOR_EDUCACIONAL':
        return solicitacao.statusMacro === 'EM_DESPACHO';
      case 'GESTOR':
        return solicitacao.itens.some(
          (item) => item.areaProgramaId === usuario?.areaProgramaId && !item.coordenadorId && !item.devolutiva,
        );
      case 'COORDENADOR':
        return solicitacao.itens.some((item) => item.coordenadorId === usuario?.id && !item.devolutiva);
      case 'MOBILIZADOR':
      case 'PRESIDENTE':
        return solicitacao.statusMacro === 'DEVOLVIDO_AJUSTE';
      default:
        return false;
    }
  }

  /** Devolvido pela Assessoria para o Mobilizador/Presidente corrigir — pede destaque visual no card. */
  precisaCorrecaoDoMobilizador(solicitacao: Solicitacao): boolean {
    return this.ehMobilizador() && solicitacao.statusMacro === 'DEVOLVIDO_AJUSTE';
  }

  abrirPdf(solicitacao: Solicitacao): void {
    if (!solicitacao.anexoOficioId) return;
    this.dialog.open(PdfViewerDialogComponent, {
      width: '860px',
      maxWidth: '95vw',
      data: {
        anexoId: solicitacao.anexoOficioId,
        titulo: solicitacao.assunto,
        nomeArquivo: solicitacao.anexoOficioNome,
      },
    });
  }
}

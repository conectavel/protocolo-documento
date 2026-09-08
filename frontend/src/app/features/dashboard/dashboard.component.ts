import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChartData, ChartOptions } from 'chart.js';
import { MetricasService } from '../../core/services/metricas.service';
import { ParceirosService } from '../../core/services/parceiros.service';
import {
  CoordenadorRegional,
  Metricas,
  Mobilizador,
  Parceiro,
  STATUS_MACRO_LABELS,
  TIPO_ITEM_LABELS,
  TipoItem,
} from '../../core/models';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';

const HOJE = () => new Date();
const DIAS_PADRAO = 30;

/**
 * Dashboard de KPIs — HU/requisitos "compreender volume, atendidos/parcial/não
 * atendidos e outros indicadores" (não acessível ao Mobilizador — HU01, ver
 * SolicitacoesService.metricas no backend).
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    LoadingStateComponent,
    ChartCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly metricasService = inject(MetricasService);
  private readonly parceirosService = inject(ParceirosService);

  /** Exposto para o template calcular a altura do gráfico de Top Parceiros conforme a quantidade de itens. */
  readonly Math = Math;

  readonly statusLabels = STATUS_MACRO_LABELS;
  readonly tipoItemLabels = TIPO_ITEM_LABELS;
  readonly tiposItem: TipoItem[] = ['ACAO_ATIVIDADE', 'PATROCINIO', 'SOLICITACAO_ITENS', 'CONVITE'];

  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly metricas = signal<Metricas | null>(null);

  readonly parceiros = signal<Parceiro[]>([]);
  readonly regionais = signal<CoordenadorRegional[]>([]);
  readonly mobilizadores = signal<Mobilizador[]>([]);

  readonly filtroForm = this.fb.nonNullable.group({
    dataInicio: [new Date(HOJE().getTime() - DIAS_PADRAO * 24 * 60 * 60 * 1000)],
    dataFim: [HOJE()],
    parceiroId: [''],
    regionalId: [''],
    mobilizadorId: [''],
    tipoSolicitacao: [''],
  });

  // Resolve tokens CSS (--chart-good etc.) para cor real — Chart.js não entende
  // var(--x) diretamente. Lido do próprio documento, então já respeita o tema
  // claro/escuro ativo no momento em que o gráfico é (re)criado.
  private corToken(nome: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || '#64748b';
  }

  private semMovimento(): boolean {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  private animacaoPadrao() {
    return this.semMovimento() ? (false as const) : { duration: 650, easing: 'easeOutQuart' as const };
  }

  private tooltipEEixosPadrao() {
    return {
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: this.corToken('--color-text-primary'),
          titleColor: this.corToken('--color-surface'),
          bodyColor: this.corToken('--color-surface'),
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
        },
      },
    };
  }

  /** Distribuição por status — donut (proporção entre poucos status é mais legível que barras). */
  readonly graficoStatus = computed<{ data: ChartData<'doughnut'>; options: ChartOptions<'doughnut'> }>(() => {
    const m = this.metricas();
    const cores: Record<string, string> = {
      ATENDIDO: this.corToken('--chart-good'),
      PARCIALMENTE_ATENDIDO: this.corToken('--chart-warning'),
      NAO_ATENDIDO: this.corToken('--chart-critical'),
      CANCELADO: this.corToken('--chart-neutral'),
    };
    const itens = (m?.porStatus ?? []).filter(
      (s) => s.total > 0 || ['ATENDIDO', 'PARCIALMENTE_ATENDIDO', 'NAO_ATENDIDO'].includes(s.status),
    );
    return {
      data: {
        labels: itens.map((s) => this.statusLabels[s.status]),
        datasets: [
          {
            data: itens.map((s) => s.total),
            backgroundColor: itens.map((s) => cores[s.status] ?? this.corToken('--color-primary')),
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        animation: this.animacaoPadrao(),
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, padding: 14, font: { size: 12 } },
          },
          tooltip: this.tooltipEEixosPadrao().plugins?.tooltip,
        },
      },
    };
  });

  /** Por tipo de solicitação — barra vertical (poucas categorias fixas). */
  readonly graficoTipoItem = computed<{ data: ChartData<'bar'>; options: ChartOptions<'bar'> }>(() => {
    const itens = this.metricas()?.porTipoItem ?? [];
    return {
      data: {
        labels: itens.map((t) => this.tipoItemLabels[t.tipo]),
        datasets: [
          {
            data: itens.map((t) => t.total),
            backgroundColor: this.corToken('--color-primary'),
            borderRadius: 6,
            maxBarThickness: 48,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: this.animacaoPadrao(),
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        ...this.tooltipEEixosPadrao(),
      },
    };
  });

  /** Evolução no período — linha com preenchimento (mais idiomático que barras para série temporal). */
  readonly graficoSerie = computed<{ data: ChartData<'line'>; options: ChartOptions<'line'> }>(() => {
    const serie = this.metricas()?.serieTemporal ?? [];
    const corPrimaria = this.corToken('--color-primary');
    return {
      data: {
        labels: serie.map((s) => new Date(s.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
        datasets: [
          {
            data: serie.map((s) => s.total),
            borderColor: corPrimaria,
            backgroundColor: corPrimaria + '26',
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: corPrimaria,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: this.animacaoPadrao(),
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        ...this.tooltipEEixosPadrao(),
      },
    };
  });

  /** Por área/programa — barra empilhada (Atendidos/Parciais/Não atendidos), mostra a composição de cada área. */
  readonly graficoArea = computed<{ data: ChartData<'bar'>; options: ChartOptions<'bar'> }>(() => {
    const itens = this.metricas()?.porArea ?? [];
    return {
      data: {
        labels: itens.map((a) => a.nome),
        datasets: [
          { label: 'Atendidos', data: itens.map((a) => a.atendidos), backgroundColor: this.corToken('--chart-good'), borderRadius: 4 },
          { label: 'Parciais', data: itens.map((a) => a.parciais), backgroundColor: this.corToken('--chart-warning'), borderRadius: 4 },
          { label: 'Não atendidos', data: itens.map((a) => a.naoAtendidos), backgroundColor: this.corToken('--chart-critical'), borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: this.animacaoPadrao(),
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14, font: { size: 12 } } },
          tooltip: this.tooltipEEixosPadrao().plugins?.tooltip,
        },
      },
    };
  });

  /** Top Parceiros — barra horizontal (nomes de sindicato costumam ser longos). */
  readonly graficoParceiro = computed<{ data: ChartData<'bar'>; options: ChartOptions<'bar'> }>(() => {
    const itens = this.metricas()?.porParceiro ?? [];
    return {
      data: {
        labels: itens.map((p) => p.nome),
        datasets: [
          {
            data: itens.map((p) => p.total),
            backgroundColor: this.corToken('--color-primary'),
            borderRadius: 6,
            maxBarThickness: 26,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: this.animacaoPadrao(),
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
        ...this.tooltipEEixosPadrao(),
      },
    };
  });

  readonly variacaoTom = computed(() => {
    const variacao = this.metricas()?.comparativoPeriodoAnterior.variacaoPercentual;
    if (variacao === null || variacao === undefined) return 'neutro';
    return variacao >= 0 ? 'positivo' : 'negativo';
  });

  ngOnInit(): void {
    this.carregarFiltrosAuxiliares();
    this.carregar();
  }

  private carregarFiltrosAuxiliares(): void {
    this.parceirosService.listar(undefined, 1, 100).subscribe({
      next: (pagina) => this.parceiros.set(pagina.data),
      error: () => this.parceiros.set([]),
    });
    this.parceirosService.listarCoordenadoresRegionais().subscribe({
      next: (lista) => this.regionais.set(lista),
      error: () => this.regionais.set([]),
    });
  }

  /** Parceiro mudou — a lista de Mobilizadores depende dele; limpa a seleção anterior. */
  aoMudarParceiro(): void {
    const parceiroId = this.filtroForm.controls.parceiroId.value;
    this.filtroForm.controls.mobilizadorId.setValue('');
    this.mobilizadores.set([]);
    if (!parceiroId) {
      this.aplicarFiltro();
      return;
    }
    this.parceirosService.listarMobilizadores(parceiroId).subscribe({
      next: (lista) => this.mobilizadores.set(lista),
      error: () => this.mobilizadores.set([]),
    });
    this.aplicarFiltro();
  }

  /** Qualquer filtro (período, Parceiro, Regional, Mobilizador, Tipo) recarrega na hora — sem botão de "aplicar". */
  aplicarFiltro(): void {
    this.carregar();
  }

  private carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    const { dataInicio, dataFim, parceiroId, regionalId, mobilizadorId, tipoSolicitacao } =
      this.filtroForm.getRawValue();
    this.metricasService
      .buscar({
        dataInicio: dataInicio?.toISOString(),
        dataFim: dataFim?.toISOString(),
        parceiroId: parceiroId || undefined,
        regionalId: regionalId || undefined,
        mobilizadorId: mobilizadorId || undefined,
        tipoSolicitacao: tipoSolicitacao || undefined,
      })
      .subscribe({
        next: (metricas) => {
          this.metricas.set(metricas);
          this.carregando.set(false);
        },
        error: () => {
          this.carregando.set(false);
          this.erro.set('Não foi possível carregar as métricas do período selecionado.');
        },
      });
  }
}

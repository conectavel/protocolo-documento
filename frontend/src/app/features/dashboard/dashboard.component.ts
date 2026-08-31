import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MetricasService } from '../../core/services/metricas.service';
import { Metricas, STATUS_MACRO_LABELS, TIPO_ITEM_LABELS } from '../../core/models';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

interface BarraStatus {
  chave: string;
  rotulo: string;
  total: number;
  percentual: number;
  cor: string;
}

interface BarraMagnitude {
  chave: string;
  rotulo: string;
  total: number;
  percentual: number;
}

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
    MatTooltipModule,
    LoadingStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly metricasService = inject(MetricasService);

  readonly statusLabels = STATUS_MACRO_LABELS;
  readonly tipoItemLabels = TIPO_ITEM_LABELS;

  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly metricas = signal<Metricas | null>(null);

  readonly filtroForm = this.fb.nonNullable.group({
    dataInicio: [new Date(HOJE().getTime() - DIAS_PADRAO * 24 * 60 * 60 * 1000)],
    dataFim: [HOJE()],
  });

  readonly barrasStatus = computed<BarraStatus[]>(() => {
    const m = this.metricas();
    if (!m) return [];
    const cores: Record<string, string> = {
      ATENDIDO: 'var(--chart-good)',
      PARCIALMENTE_ATENDIDO: 'var(--chart-warning)',
      NAO_ATENDIDO: 'var(--chart-critical)',
      CANCELADO: 'var(--chart-neutral)',
    };
    const maior = Math.max(1, ...m.porStatus.map((s) => s.total));
    return m.porStatus
      .filter((s) => s.total > 0 || ['ATENDIDO', 'PARCIALMENTE_ATENDIDO', 'NAO_ATENDIDO'].includes(s.status))
      .map((s) => ({
        chave: s.status,
        rotulo: this.statusLabels[s.status],
        total: s.total,
        percentual: Math.round((s.total / maior) * 100),
        cor: cores[s.status] ?? 'var(--color-primary)',
      }));
  });

  readonly barrasTipoItem = computed<BarraMagnitude[]>(() =>
    this.paraBarrasMagnitude(
      (this.metricas()?.porTipoItem ?? []).map((t) => ({
        chave: t.tipo,
        rotulo: this.tipoItemLabels[t.tipo],
        total: t.total,
      })),
    ),
  );

  readonly barrasArea = computed<BarraMagnitude[]>(() =>
    this.paraBarrasMagnitude(
      (this.metricas()?.porArea ?? []).map((a) => ({ chave: a.areaProgramaId, rotulo: a.nome, total: a.total })),
    ),
  );

  readonly barrasParceiro = computed<BarraMagnitude[]>(() =>
    this.paraBarrasMagnitude(
      (this.metricas()?.porParceiro ?? []).map((p) => ({
        chave: p.parceiroId,
        rotulo: p.nome,
        total: p.total,
      })),
    ),
  );

  readonly serieBarras = computed(() => {
    const serie = this.metricas()?.serieTemporal ?? [];
    const maior = Math.max(1, ...serie.map((s) => s.total));
    return serie.map((s) => {
      const percentual = Math.round((s.total / maior) * 100);
      return {
        ...s,
        percentual,
        percentualVisivel: Math.max(percentual, 4), // barra sempre visível, mesmo com 1 solicitação
        rotulo: new Date(s.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      };
    });
  });

  readonly variacaoTom = computed(() => {
    const variacao = this.metricas()?.comparativoPeriodoAnterior.variacaoPercentual;
    if (variacao === null || variacao === undefined) return 'neutro';
    return variacao >= 0 ? 'positivo' : 'negativo';
  });

  ngOnInit(): void {
    this.carregar();
  }

  aplicarFiltro(): void {
    this.carregar();
  }

  private carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    const { dataInicio, dataFim } = this.filtroForm.getRawValue();
    this.metricasService
      .buscar({
        dataInicio: dataInicio?.toISOString(),
        dataFim: dataFim?.toISOString(),
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

  private paraBarrasMagnitude(
    itens: { chave: string; rotulo: string; total: number }[],
  ): BarraMagnitude[] {
    const maior = Math.max(1, ...itens.map((i) => i.total));
    return itens
      .slice()
      .sort((a, b) => b.total - a.total)
      .map((i) => ({ ...i, percentual: Math.round((i.total / maior) * 100) }));
  }
}

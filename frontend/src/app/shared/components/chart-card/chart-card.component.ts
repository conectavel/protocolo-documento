import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  Chart,
  ChartConfiguration,
  ChartData,
  ChartOptions,
  ChartType,
  registerables,
} from 'chart.js';

Chart.register(...registerables);

/**
 * Wrapper fino em volta de um <canvas> do Chart.js — cria o gráfico uma vez e
 * só atualiza dados/opções nas trocas seguintes (evita recriar o canvas a cada
 * re-render, o que perderia a animação de entrada). Tooltip e animação vêm de
 * graça do próprio Chart.js; só o tema (cores) é resolvido a partir dos
 * tokens CSS da página, para funcionar em claro/escuro sem duplicar paleta.
 */
@Component({
  selector: 'app-chart-card',
  standalone: true,
  template: `<div class="chart-card__wrap" [style.height.px]="altura"><canvas #canvas></canvas></div>`,
  styles: [
    `
      .chart-card__wrap {
        position: relative;
        width: 100%;
      }
      canvas {
        width: 100% !important;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: true }) private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input({ required: true }) type!: ChartType;
  @Input({ required: true }) data!: ChartData;
  @Input() options?: ChartOptions;
  @Input() altura = 280;

  private chart?: Chart;

  ngAfterViewInit(): void {
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: this.type,
      data: this.data,
      options: this.options,
    } as ChartConfiguration);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.chart) return;
    if (changes['data']) {
      this.chart.data = this.data;
    }
    if (changes['options'] && this.options) {
      this.chart.options = this.options;
    }
    this.chart.update();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AlertaService, AlertaTipo } from '../../../core/services/alerta.service';

const ICONE_POR_TIPO: Record<AlertaTipo, string> = {
  sucesso: 'check_circle',
  erro: 'error',
  aviso: 'warning',
  info: 'info',
};

/**
 * Banner de alerta no topo da tela, montado uma única vez no shell — vale
 * para toda ação do app (salvar, cancelar, aprovar, recusar, despachar...).
 * Ver AlertaService para como disparar.
 */
@Component({
  selector: 'app-alerta-topo',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (alerta.estado(); as estado) {
      <div id="alerta" class="alerta-topo" [class]="'alerta-topo--' + estado.tipo" role="alert">
        <mat-icon>{{ icones[estado.tipo] }}</mat-icon>
        <span class="alerta-topo__texto">{{ estado.mensagem }}</span>
        <button type="button" class="alerta-topo__fechar" (click)="alerta.fechar()" aria-label="Fechar aviso">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    }
  `,
  styleUrl: './alerta-topo.component.scss',
})
export class AlertaTopoComponent {
  readonly alerta = inject(AlertaService);
  readonly icones = ICONE_POR_TIPO;
}

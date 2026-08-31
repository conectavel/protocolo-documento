import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Estado de carregamento (Template 4): card branco, ícone
 * hourglass_empty teal, texto "Carregando …".
 */
@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="po-state-card po-state-card--loading">
      <mat-icon>hourglass_empty</mat-icon>
      <span>{{ mensagem() }}</span>
    </div>
  `,
})
export class LoadingStateComponent {
  readonly mensagem = input<string>('Carregando …');
}

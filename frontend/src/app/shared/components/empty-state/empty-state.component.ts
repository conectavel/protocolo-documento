import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Estado vazio simples (Template 4, seção "Vazio / loading"):
 * card branco, centralizado, ícone info_outline cinza.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="po-state-card po-state-card--empty">
      <mat-icon>{{ icone() }}</mat-icon>
      <span>{{ mensagem() }}</span>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly mensagem = input<string>('Nenhum dado disponível');
  readonly icone = input<string>('info_outline');
}

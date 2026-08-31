import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  STATUS_ITEM_LABELS,
  STATUS_MACRO_LABELS,
  StatusItem,
  StatusMacro,
  chipTomStatusItem,
  chipTomStatusMacro,
} from '../../../core/models';

const ICONE_POR_TOM: Record<'success' | 'warning' | 'neutral', string> = {
  success: 'check_circle',
  warning: 'schedule',
  neutral: 'radio_button_unchecked',
};

/**
 * Chip de status (seção 9 da spec visual): pílula, 10px, uppercase, com ícone
 * indicando o tom — a identidade nunca depende só da cor (acessibilidade).
 * Aceita status macro (Solicitação) ou status de item, ou um par
 * label/tom customizado para outros usos pontuais.
 */
@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="po-chip po-chip--{{ tom() }}">
      <mat-icon>{{ icone() }}</mat-icon>
      {{ texto() }}
    </span>
  `,
})
export class StatusChipComponent {
  readonly statusMacro = input<StatusMacro | undefined>(undefined);
  readonly statusItem = input<StatusItem | undefined>(undefined);
  readonly label = input<string | undefined>(undefined);
  readonly tomForcado = input<'success' | 'warning' | 'neutral' | undefined>(undefined);

  readonly texto = computed(() => {
    if (this.label()) {
      return this.label();
    }
    if (this.statusMacro()) {
      return STATUS_MACRO_LABELS[this.statusMacro() as StatusMacro];
    }
    if (this.statusItem()) {
      return STATUS_ITEM_LABELS[this.statusItem() as StatusItem];
    }
    return '';
  });

  readonly tom = computed(() => {
    if (this.tomForcado()) {
      return this.tomForcado();
    }
    if (this.statusMacro()) {
      return chipTomStatusMacro(this.statusMacro() as StatusMacro);
    }
    if (this.statusItem()) {
      return chipTomStatusItem(this.statusItem() as StatusItem);
    }
    return 'neutral';
  });

  readonly icone = computed(() => ICONE_POR_TOM[this.tom() as 'success' | 'warning' | 'neutral']);
}

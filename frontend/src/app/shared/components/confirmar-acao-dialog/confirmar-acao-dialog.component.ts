import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface ConfirmarAcaoDialogData {
  titulo: string;
  mensagem: string;
  rotuloConfirmar?: string;
  corConfirmar?: 'primary' | 'warn';
  icone?: string;
  /** Resumo opcional (rótulo/valor) para revisão antes de confirmar — ex.: dados do protocolo antes de salvar. */
  resumo?: { rotulo: string; valor: string }[];
  /** Quando informado, exibe uma caixa de texto opcional (ex.: observação do Assessor ao aprovar). */
  campoObservacao?: { rotulo: string; placeholder?: string };
  /** Lembrete de que as atualizações seguintes chegam pelas notificações (Configurações). */
  avisoNotificacao?: boolean;
}

export interface ConfirmarAcaoDialogResultado {
  confirmado: true;
  observacao?: string;
}

/**
 * Popup de confirmação genérico — usado antes de ações imediatas e
 * irreversíveis (Aprovar/Prosseguir, Salvar protocolo, Cancelar protocolo,
 * etc.). Quando `data.resumo` é informado, funciona também como revisão
 * rápida das informações antes de confirmar.
 */
@Component({
  selector: 'app-confirmar-acao-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="confirmar-dialog">
      <div class="confirmar-dialog__icone" [class.confirmar-dialog__icone--warn]="data.corConfirmar === 'warn'">
        <mat-icon>{{ data.icone || 'help_outline' }}</mat-icon>
      </div>
      <h2>{{ data.titulo }}</h2>
      <p>{{ data.mensagem }}</p>

      @if (data.resumo?.length) {
        <div class="confirmar-dialog__resumo">
          @for (linha of data.resumo; track linha.rotulo) {
            <div class="confirmar-dialog__resumo-linha">
              <span>{{ linha.rotulo }}</span>
              <strong>{{ linha.valor }}</strong>
            </div>
          }
        </div>
      }

      @if (data.campoObservacao; as campo) {
        <mat-form-field appearance="outline" class="confirmar-dialog__observacao">
          <mat-label>{{ campo.rotulo }}</mat-label>
          <textarea
            matInput
            rows="3"
            [placeholder]="campo.placeholder || ''"
            [ngModel]="observacao()"
            (ngModelChange)="observacao.set($event)"
          ></textarea>
        </mat-form-field>
      }

      @if (data.avisoNotificacao) {
        <p class="confirmar-dialog__aviso-notificacao">
          <mat-icon>notifications_active</mat-icon>
          Acompanhe as próximas atualizações pelas notificações (ajuste em Configurações).
        </p>
      }

      <div class="confirmar-dialog__acoes">
        <button mat-stroked-button class="confirmar-dialog__botao" type="button" (click)="fechar()">Cancelar</button>
        <button
          mat-flat-button
          class="confirmar-dialog__botao"
          [color]="data.corConfirmar || 'primary'"
          type="button"
          (click)="confirmar()"
        >
          {{ data.rotuloConfirmar || 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .confirmar-dialog {
        padding: 28px 24px 24px;
        width: 100%;
        max-width: 460px;
        text-align: center;
      }
      .confirmar-dialog__icone {
        width: 48px;
        height: 48px;
        margin: 0 auto 12px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-accent-light);
        color: var(--color-accent);

        .mat-icon {
          font-size: 26px;
          width: 26px;
          height: 26px;
        }

        &--warn {
          background: rgba(220, 38, 38, 0.1);
          color: var(--color-warn);
        }
      }
      .confirmar-dialog h2 {
        font-size: 18px;
        font-weight: 600;
        color: var(--color-text-primary);
        margin: 0;
      }
      .confirmar-dialog p {
        font-size: 13.5px;
        color: var(--color-text-secondary);
        margin-top: 8px;
        line-height: 1.5;
      }
      .confirmar-dialog__resumo {
        margin-top: 16px;
        padding: 12px 14px;
        border-radius: var(--radius-sm);
        background: var(--color-bg-page);
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .confirmar-dialog__resumo-linha {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 13px;

        span {
          color: var(--color-text-secondary);
        }
        strong {
          color: var(--color-text-primary);
          font-weight: 600;
          text-align: right;
        }
      }
      .confirmar-dialog__observacao {
        display: block;
        width: 100%;
        text-align: left;
        margin-top: 16px;
      }
      .confirmar-dialog__aviso-notificacao {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 14px 0 0;
        padding: 10px 14px;
        border-radius: 999px;
        background: var(--color-accent-light);
        color: var(--color-text-secondary);
        font-size: 12px;
        line-height: 1.4;
        text-align: left;

        .mat-icon {
          flex-shrink: 0;
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: var(--color-accent);
        }
      }
      .confirmar-dialog__acoes {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 22px;
      }
      .confirmar-dialog__botao {
        border-radius: 999px;
        font-weight: 600;
        padding: 4px 8px;
        transition: transform 0.15s ease;

        &:hover:not(:disabled) {
          transform: translateY(-1px);
        }
      }
    `,
  ],
})
export class ConfirmarAcaoDialogComponent {
  private readonly dialogRef =
    inject<MatDialogRef<ConfirmarAcaoDialogComponent, boolean | ConfirmarAcaoDialogResultado>>(MatDialogRef);
  readonly data = inject<ConfirmarAcaoDialogData>(MAT_DIALOG_DATA);

  readonly observacao = signal('');

  fechar(): void {
    this.dialogRef.close(false);
  }

  confirmar(): void {
    if (this.data.campoObservacao) {
      this.dialogRef.close({ confirmado: true, observacao: this.observacao().trim() || undefined });
      return;
    }
    this.dialogRef.close(true);
  }
}

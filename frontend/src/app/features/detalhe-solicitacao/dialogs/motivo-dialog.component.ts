import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface MotivoDialogData {
  titulo: string;
  subtitulo?: string;
  rotuloCampo?: string;
  rotuloConfirmar?: string;
  corConfirmar?: 'primary' | 'warn';
  obrigatorio?: boolean;
}

/**
 * Dialog de formulário (Template 8) para capturar um motivo obrigatório —
 * usado em Devolver para ajuste, Recusar (Assessor) e Encaminhar (Coordenador).
 * Retorna a string do motivo, ou undefined se cancelado.
 */
@Component({
  selector: 'app-motivo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="motivo-dialog">
      <div class="motivo-dialog__header">
        <h2>{{ data.titulo }}</h2>
        <button mat-icon-button (click)="fechar()" aria-label="Fechar">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      @if (data.subtitulo) {
        <p class="motivo-dialog__subtitulo">{{ data.subtitulo }}</p>
      }

      <form [formGroup]="formulario">
        <mat-form-field appearance="outline" class="motivo-dialog__campo">
          <mat-label>{{ data.rotuloCampo || 'Motivo' }}</mat-label>
          <textarea matInput rows="4" formControlName="motivo"></textarea>
          @if (formulario.controls.motivo.invalid && formulario.controls.motivo.touched) {
            <mat-error>Este campo é obrigatório</mat-error>
          }
        </mat-form-field>
      </form>

      <div class="motivo-dialog__acoes">
        <button mat-stroked-button type="button" (click)="fechar()">Cancelar</button>
        <button
          mat-flat-button
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
      .motivo-dialog {
        padding: 24px;
        width: 100%;
        max-width: 560px;
      }
      .motivo-dialog__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .motivo-dialog__header h2 {
        font-size: 20px;
        font-weight: 600;
        color: #065f46;
        margin: 0;
      }
      .motivo-dialog__subtitulo {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-top: 4px;
      }
      .motivo-dialog__campo {
        width: 100%;
        margin-top: 16px;
      }
      .motivo-dialog__acoes {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-top: 8px;
      }
    `,
  ],
})
export class MotivoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<MotivoDialogComponent, string | undefined>>(
    MatDialogRef
  );
  readonly data = inject<MotivoDialogData>(MAT_DIALOG_DATA);

  readonly enviando = signal(false);

  readonly formulario = this.fb.nonNullable.group({
    motivo: ['', this.data.obrigatorio === false ? [] : [Validators.required]],
  });

  fechar(): void {
    this.dialogRef.close(undefined);
  }

  confirmar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.formulario.getRawValue().motivo);
  }
}

import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AreaPrograma } from '../../../core/models';

export interface SelecionarAreaDialogData {
  titulo: string;
  subtitulo?: string;
  areas: AreaPrograma[];
  /** Tipo do Evento do próprio item, só para referência (não pode ser alterado aqui). */
  tipoEvento?: string;
}

export interface SelecionarAreaDialogResultado {
  areaProgramaId: string;
  coordenadorId?: string;
  observacao?: string;
}

/**
 * Dialog usado pelo Diretor para direcionar UM item para uma Área/Programa
 * (HU05) — cada item de uma mesma solicitação pode ir para uma área
 * diferente, então esta escolha é sempre por item, nunca em lote. Se o
 * Coordenador já for escolhido aqui, pula a etapa do Gestor (HU06).
 */
@Component({
  selector: 'app-selecionar-area-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sel-dialog">
      <h2>{{ data.titulo }}</h2>
      @if (data.subtitulo) {
        <p class="sel-dialog__subtitulo">{{ data.subtitulo }}</p>
      }

      <form [formGroup]="form" class="sel-dialog__form">
        <mat-form-field appearance="outline">
          <mat-label>Gerente / Área responsável</mat-label>
          <mat-select formControlName="areaProgramaId">
            @for (area of data.areas; track area.id) {
              <mat-option [value]="area.id">
                {{ area.gestorNome ? 'Gerente ' + area.gestorNome + ' — ' + area.nome : area.nome }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        @if (data.tipoEvento) {
          <mat-form-field appearance="outline">
            <mat-label>Tipo do Evento</mat-label>
            <input matInput [value]="data.tipoEvento" readonly disabled />
          </mat-form-field>
        }

        <mat-form-field appearance="outline">
          <mat-label>Coordenador (opcional — deixe em branco para delegar ao Gestor)</mat-label>
          <mat-select formControlName="coordenadorId">
            <mat-option value="">Delegar ao Gestor</mat-option>
            @for (coord of coordenadoresDaArea(); track coord.id) {
              <mat-option [value]="coord.id">{{ coord.nome }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Observações (opcional)</mat-label>
          <textarea
            matInput
            rows="3"
            formControlName="observacao"
            placeholder="Alguma orientação para quem vai receber este item?"
          ></textarea>
        </mat-form-field>
      </form>

      <div class="sel-dialog__acoes">
        <button mat-button type="button" (click)="fechar()">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          [disabled]="form.invalid"
          (click)="confirmar()"
        >
          <mat-icon>alt_route</mat-icon>
          Direcionar
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .sel-dialog {
        padding: 24px;
        width: 100%;
        max-width: 480px;
      }
      .sel-dialog h2 {
        font-size: 20px;
        font-weight: 600;
        color: var(--color-text-primary);
        margin: 0;
      }
      .sel-dialog__subtitulo {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-top: 4px;
        margin-bottom: 16px;
      }
      .sel-dialog__form {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 8px;
      }
      .sel-dialog__acoes {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 12px;
      }
    `,
  ],
})
export class SelecionarAreaDialogComponent {
  private readonly fb = new FormBuilder();

  readonly form = this.fb.nonNullable.group({
    areaProgramaId: ['', Validators.required],
    coordenadorId: [''],
    observacao: [''],
  });

  constructor(
    private readonly dialogRef: MatDialogRef<
      SelecionarAreaDialogComponent,
      SelecionarAreaDialogResultado | undefined
    >,
    @Inject(MAT_DIALOG_DATA) readonly data: SelecionarAreaDialogData
  ) {
    this.form.controls.areaProgramaId.valueChanges.subscribe(() => {
      this.form.controls.coordenadorId.setValue('');
    });
  }

  coordenadoresDaArea() {
    const areaId = this.form.controls.areaProgramaId.value;
    return this.data.areas.find((a) => a.id === areaId)?.coordenadores ?? [];
  }

  confirmar(): void {
    if (this.form.invalid) {
      return;
    }
    const valores = this.form.getRawValue();
    this.dialogRef.close({
      areaProgramaId: valores.areaProgramaId,
      coordenadorId: valores.coordenadorId || undefined,
      observacao: valores.observacao.trim() || undefined,
    });
  }

  fechar(): void {
    this.dialogRef.close(undefined);
  }
}

import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EditarItemRequest, ItemSolicitacao } from '../../../core/models';

export interface EditarItemDialogData {
  item: ItemSolicitacao;
  turnoLabels: Record<string, string>;
  turnos: string[];
}

/**
 * O Coordenador corrige aqui os campos que o Mobilizador/Presidente preencheu
 * no protocolo (HU07 — a versão do Coordenador é a que vale a partir de agora;
 * o valor original fica só no histórico discreto do card do item).
 */
@Component({
  selector: 'app-editar-item-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sel-dialog">
      <h2>Editar item</h2>
      <p class="sel-dialog__subtitulo">
        Os valores originais informados pelo Mobilizador/Presidente ficam preservados no histórico
        do item — a partir de agora, vale o que você preencher aqui.
      </p>

      <form [formGroup]="form" class="sel-dialog__form">
        <mat-form-field appearance="outline">
          <mat-label>Tipo do Evento</mat-label>
          <input matInput formControlName="tipoEvento" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Ação/Atividade</mat-label>
          <input matInput formControlName="acaoAtividade" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Disciplina</mat-label>
          <input matInput formControlName="disciplina" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Turno</mat-label>
          <mat-select formControlName="turno">
            @for (turno of data.turnos; track turno) {
              <mat-option [value]="turno">{{ data.turnoLabels[turno] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Data início</mat-label>
          <input matInput [matDatepicker]="pickerInicio" formControlName="dataInicio" />
          <mat-datepicker-toggle matIconSuffix [for]="pickerInicio"></mat-datepicker-toggle>
          <mat-datepicker #pickerInicio></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Data fim</mat-label>
          <input matInput [matDatepicker]="pickerFim" formControlName="dataFim" />
          <mat-datepicker-toggle matIconSuffix [for]="pickerFim"></mat-datepicker-toggle>
          <mat-datepicker #pickerFim></mat-datepicker>
        </mat-form-field>
      </form>

      <div class="sel-dialog__acoes">
        <button mat-button type="button" (click)="fechar()">Cancelar</button>
        <button mat-flat-button color="primary" type="button" (click)="confirmar()">
          <mat-icon>save</mat-icon>
          Salvar alterações
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .sel-dialog {
        padding: 24px;
        width: 100%;
        max-width: 560px;
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
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px 12px;
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
export class EditarItemDialogComponent {
  private readonly fb = new FormBuilder();
  readonly form;

  constructor(
    private readonly dialogRef: MatDialogRef<EditarItemDialogComponent, EditarItemRequest | undefined>,
    @Inject(MAT_DIALOG_DATA) readonly data: EditarItemDialogData
  ) {
    this.form = this.fb.nonNullable.group({
      tipoEvento: [data.item.tipoEvento ?? ''],
      acaoAtividade: [data.item.acaoAtividade ?? ''],
      disciplina: [data.item.disciplina ?? ''],
      turno: [data.item.turno ?? ''],
      dataInicio: [data.item.dataInicio ? new Date(data.item.dataInicio) : (null as Date | null)],
      dataFim: [data.item.dataFim ? new Date(data.item.dataFim) : (null as Date | null)],
    });
  }

  confirmar(): void {
    const valores = this.form.getRawValue();
    this.dialogRef.close({
      tipoEvento: valores.tipoEvento || undefined,
      acaoAtividade: valores.acaoAtividade || undefined,
      disciplina: valores.disciplina || undefined,
      turno: valores.turno || undefined,
      dataInicio: valores.dataInicio ? valores.dataInicio.toISOString() : undefined,
      dataFim: valores.dataFim ? valores.dataFim.toISOString() : undefined,
    });
  }

  fechar(): void {
    this.dialogRef.close(undefined);
  }
}

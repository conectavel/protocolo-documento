import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PAPEL_LABELS, SalvarSubstituicaoRequest, Substituicao, UsuarioResumo } from '../../../core/models';

export interface SubstitutoDialogData {
  usuarios: UsuarioResumo[];
  substituicao?: Substituicao;
}

/**
 * Dialog "Adicionar/Editar Substituto" — equivalente ao painel de Substitutos do Fluig:
 * usuário substituído, usuário substituto, período e escopo (todos os processos ou não).
 */
@Component({
  selector: 'app-substituto-dialog',
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
    MatSlideToggleModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './substituto-dialog.component.html',
  styleUrl: './substituto-dialog.component.scss',
})
export class SubstitutoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<SubstitutoDialogComponent, SalvarSubstituicaoRequest | undefined>>(
    MatDialogRef,
  );
  readonly data = inject<SubstitutoDialogData>(MAT_DIALOG_DATA);

  readonly papelLabels = PAPEL_LABELS;
  readonly erro = signal<string | null>(null);

  readonly formulario = this.fb.nonNullable.group({
    usuarioSubstituidoId: [this.data.substituicao?.usuarioSubstituidoId ?? '', Validators.required],
    usuarioSubstitutoId: [this.data.substituicao?.usuarioSubstitutoId ?? '', Validators.required],
    dataInicio: [this.paraData(this.data.substituicao?.dataInicio) ?? new Date(), Validators.required],
    dataFim: [this.paraData(this.data.substituicao?.dataFim) ?? new Date(), Validators.required],
    substituirTodosProcessos: [this.data.substituicao?.substituirTodosProcessos ?? true],
    justificativa: [this.data.substituicao?.justificativa ?? ''],
  });

  fechar(): void {
    this.dialogRef.close(undefined);
  }

  salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const valores = this.formulario.getRawValue();

    if (valores.usuarioSubstituidoId === valores.usuarioSubstitutoId) {
      this.erro.set('O substituto não pode ser o mesmo usuário substituído.');
      return;
    }
    if (valores.dataFim < valores.dataInicio) {
      this.erro.set('A data fim não pode ser anterior à data início.');
      return;
    }

    this.dialogRef.close({
      usuarioSubstituidoId: valores.usuarioSubstituidoId,
      usuarioSubstitutoId: valores.usuarioSubstitutoId,
      dataInicio: this.paraIso(valores.dataInicio),
      dataFim: this.paraIso(valores.dataFim),
      substituirTodosProcessos: valores.substituirTodosProcessos,
      justificativa: valores.justificativa || undefined,
    });
  }

  private paraData(iso?: string): Date | null {
    return iso ? new Date(iso + 'T00:00:00') : null;
  }

  private paraIso(data: Date): string {
    return data.toISOString().slice(0, 10);
  }
}

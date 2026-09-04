import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { PAPEL_LABELS, UsuarioAdmin, UsuarioResumo } from '../../../core/models';

export interface TransferirProcessosDialogData {
  usuarioOrigem: UsuarioAdmin;
}

/**
 * Desligamento — escolhe quem recebe o trabalho em aberto do usuário que sai
 * (itens de Coordenador, solicitações designadas a um Diretor, Áreas/Programa
 * sob um Gestor). Ver UsuariosAdminService no backend para o que exatamente
 * é transferido.
 */
@Component({
  selector: 'app-transferir-processos-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="transferir-dialog">
      <h2>Transferir processos</h2>
      <p class="transferir-dialog__subtitulo">
        Todo o trabalho em aberto de <strong>{{ data.usuarioOrigem.nome }}</strong>
        ({{ papelLabels[data.usuarioOrigem.papel] }}) — itens ainda não finalizados, solicitações
        em execução e Áreas/Programa sob sua gestão — passa a ser de quem você escolher abaixo.
        O que já foi concluído continua registrado no histórico normalmente.
      </p>

      <form [formGroup]="form" class="transferir-dialog__form">
        <mat-form-field appearance="outline">
          <mat-label>Transferir para</mat-label>
          <mat-select formControlName="paraUsuarioId">
            @for (candidato of candidatos(); track candidato.id) {
              <mat-option [value]="candidato.id">{{ candidato.nome }}</mat-option>
            }
          </mat-select>
          @if (candidatos().length === 0) {
            <mat-hint>Nenhum outro usuário com o mesmo papel disponível.</mat-hint>
          }
        </mat-form-field>
      </form>

      <div class="transferir-dialog__acoes">
        <button mat-stroked-button type="button" (click)="fechar()">Cancelar</button>
        <button
          mat-flat-button
          color="warn"
          type="button"
          [disabled]="form.invalid"
          (click)="confirmar()"
        >
          <mat-icon>move_up</mat-icon>
          Transferir
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .transferir-dialog {
        padding: 24px;
        width: 100%;
        max-width: 480px;
      }
      .transferir-dialog h2 {
        font-size: 19px;
        font-weight: 600;
        color: var(--color-text-primary);
        margin: 0;
      }
      .transferir-dialog__subtitulo {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-top: 8px;
        margin-bottom: 16px;
        line-height: 1.5;
      }
      .transferir-dialog__form {
        display: flex;
        flex-direction: column;
      }
      .transferir-dialog__acoes {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 12px;
      }
    `,
  ],
})
export class TransferirProcessosDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialogRef = inject<MatDialogRef<TransferirProcessosDialogComponent, string | undefined>>(
    MatDialogRef
  );
  readonly data = inject<TransferirProcessosDialogData>(MAT_DIALOG_DATA);

  readonly papelLabels = PAPEL_LABELS;
  readonly candidatos = signal<UsuarioResumo[]>([]);

  readonly form = this.fb.nonNullable.group({
    paraUsuarioId: ['', Validators.required],
  });

  ngOnInit(): void {
    this.usuariosService.listarPorPapel(this.data.usuarioOrigem.papel).subscribe({
      next: (lista) => this.candidatos.set(lista.filter((u) => u.id !== this.data.usuarioOrigem.id)),
      error: () => this.candidatos.set([]),
    });
  }

  confirmar(): void {
    if (this.form.invalid) {
      return;
    }
    this.dialogRef.close(this.form.getRawValue().paraUsuarioId);
  }

  fechar(): void {
    this.dialogRef.close(undefined);
  }
}

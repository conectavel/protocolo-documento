import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { PAPEL_LABELS, Papel, UsuarioAdmin } from '../../../core/models';

export interface PromoverPapelDialogData {
  /** Perfil de destino — o usuário escolhido passa a ter este papel. */
  papelAlvo: Papel;
  /** Candidatos: qualquer usuário gerenciável que ainda não tenha `papelAlvo`. */
  candidatos: UsuarioAdmin[];
}

const ORDEM_PAPEIS: Papel[] = [
  'ADMIN',
  'SUPERINTENDENTE',
  'ASSESSOR',
  'DIRETOR_EDUCACIONAL',
  'GESTOR',
  'COORDENADOR',
];

/**
 * Adicionar um usuário a um perfil — promove/realoca um usuário já cadastrado em
 * outro perfil interno. Ele deixa de atuar no perfil anterior a partir da
 * confirmação aqui (ver UsuariosAdminService.alterarPapel no backend).
 */
@Component({
  selector: 'app-promover-papel-dialog',
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
    <div class="promover-dialog">
      <h2>
        <mat-icon>person_add</mat-icon>
        Adicionar {{ papelLabels[data.papelAlvo] }}
      </h2>
      <p class="promover-dialog__subtitulo">
        Escolha um usuário já cadastrado para mover para o perfil <strong>{{ papelLabels[data.papelAlvo] }}</strong>.
        Ele deixa de atuar no perfil atual.
      </p>

      <form [formGroup]="form" class="promover-dialog__form">
        <mat-form-field appearance="outline">
          <mat-label>Usuário</mat-label>
          <mat-select formControlName="usuarioId">
            @for (grupo of gruposPorPapel(); track grupo.papel) {
              <mat-optgroup [label]="papelLabels[grupo.papel]">
                @for (usuario of grupo.usuarios; track usuario.id) {
                  <mat-option [value]="usuario.id">{{ usuario.nome }} ({{ usuario.email }})</mat-option>
                }
              </mat-optgroup>
            }
          </mat-select>
          @if (data.candidatos.length === 0) {
            <mat-hint>Não há outros usuários cadastrados para mover.</mat-hint>
          }
        </mat-form-field>

        @if (usuarioSelecionado(); as usuario) {
          <p class="promover-dialog__aviso">
            <mat-icon>info</mat-icon>
            <strong>{{ usuario.nome }}</strong> deixará de atuar como {{ papelLabels[usuario.papel] }}.
          </p>
        }
      </form>

      <div class="promover-dialog__acoes">
        <button mat-stroked-button type="button" (click)="fechar()">Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          [disabled]="form.invalid"
          (click)="confirmar()"
        >
          <mat-icon>person_add</mat-icon>
          Adicionar {{ papelLabels[data.papelAlvo] }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .promover-dialog {
        padding: 24px;
        width: 100%;
        max-width: 480px;
      }
      .promover-dialog h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 19px;
        font-weight: 600;
        color: var(--color-text-primary);
        margin: 0;
      }
      .promover-dialog__subtitulo {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-top: 8px;
        margin-bottom: 16px;
        line-height: 1.5;
      }
      .promover-dialog__form {
        display: flex;
        flex-direction: column;
      }
      .promover-dialog__aviso {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: -4px 0 4px;
        padding: 10px 12px;
        border-radius: 8px;
        background: rgba(255, 152, 0, 0.1);
        color: #a15c00;
        font-size: 12.5px;
        line-height: 1.5;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          margin-top: 1px;
        }
      }
      .promover-dialog__acoes {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 12px;
      }
    `,
  ],
})
export class PromoverPapelDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<PromoverPapelDialogComponent, string | undefined>>(MatDialogRef);
  readonly data = inject<PromoverPapelDialogData>(MAT_DIALOG_DATA);

  readonly papelLabels = PAPEL_LABELS;

  readonly form = this.fb.nonNullable.group({
    usuarioId: ['', Validators.required],
  });

  readonly gruposPorPapel = computed(() => {
    const porPapel = new Map<Papel, UsuarioAdmin[]>();
    for (const usuario of this.data.candidatos) {
      const lista = porPapel.get(usuario.papel) ?? [];
      lista.push(usuario);
      porPapel.set(usuario.papel, lista);
    }
    return ORDEM_PAPEIS.filter((papel) => papel !== this.data.papelAlvo && porPapel.has(papel)).map((papel) => ({
      papel,
      usuarios: porPapel.get(papel)!,
    }));
  });

  private readonly usuarioIdSelecionado = signal('');

  readonly usuarioSelecionado = computed(() => {
    const id = this.usuarioIdSelecionado();
    return this.data.candidatos.find((u) => u.id === id);
  });

  constructor() {
    this.form.controls.usuarioId.valueChanges.subscribe((valor) => this.usuarioIdSelecionado.set(valor));
  }

  confirmar(): void {
    if (this.form.invalid) {
      return;
    }
    this.dialogRef.close(this.form.getRawValue().usuarioId);
  }

  fechar(): void {
    this.dialogRef.close(undefined);
  }
}

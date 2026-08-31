import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CoordenadorAreaPrograma } from '../../../core/models';

export interface SelecionarCoordenadorDialogData {
  titulo: string;
  subtitulo?: string;
  coordenadores: CoordenadorAreaPrograma[];
}

/**
 * Dialog de escolha (Template 8) — usado pelo Gestor para designar o
 * Coordenador da Ação/Programa responsável por um item (HU06).
 * Retorna o id do coordenador escolhido, ou undefined se cancelado.
 */
@Component({
  selector: 'app-selecionar-coordenador-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sel-dialog">
      <h2>{{ data.titulo }}</h2>
      @if (data.subtitulo) {
        <p class="sel-dialog__subtitulo">{{ data.subtitulo }}</p>
      }

      <div class="sel-dialog__grid">
        @for (coordenador of data.coordenadores; track coordenador.id) {
          <button
            type="button"
            class="sel-dialog__card"
            (click)="escolher(coordenador.id)"
          >
            <mat-icon>person</mat-icon>
            <div>
              <strong>{{ coordenador.nome }}</strong>
              <span>Coordenador(a) da Ação/Programa</span>
            </div>
          </button>
        }

        @if (data.coordenadores.length === 0) {
          <p class="sel-dialog__vazio">Nenhum coordenador disponível para esta área.</p>
        }
      </div>

      <div class="sel-dialog__acoes">
        <button mat-button type="button" (click)="fechar()">Cancelar</button>
      </div>
    </div>
  `,
  styles: [
    `
      .sel-dialog {
        padding: 24px;
        width: 100%;
        max-width: 640px;
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
      .sel-dialog__grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 8px;
      }
      .sel-dialog__card {
        display: flex;
        align-items: center;
        gap: 12px;
        text-align: left;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        padding: 16px;
        background: var(--color-surface);
        cursor: pointer;
      }
      .sel-dialog__card:hover {
        border-color: var(--color-accent);
        background: #ecfdf5;
      }
      .sel-dialog__card mat-icon {
        color: var(--color-accent);
      }
      .sel-dialog__card strong {
        display: block;
        font-size: 14px;
        color: var(--color-text-primary);
      }
      .sel-dialog__card span {
        display: block;
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .sel-dialog__vazio {
        font-size: 13px;
        color: var(--color-text-secondary);
        grid-column: 1 / -1;
      }
      .sel-dialog__acoes {
        display: flex;
        justify-content: flex-end;
        margin-top: 20px;
      }
    `,
  ],
})
export class SelecionarCoordenadorDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<SelecionarCoordenadorDialogComponent, string | undefined>,
    @Inject(MAT_DIALOG_DATA) readonly data: SelecionarCoordenadorDialogData
  ) {}

  escolher(coordenadorId: string): void {
    this.dialogRef.close(coordenadorId);
  }

  fechar(): void {
    this.dialogRef.close(undefined);
  }
}

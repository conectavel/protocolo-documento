import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { PdfViewerComponent } from '../pdf-viewer/pdf-viewer.component';

export interface PdfViewerDialogData {
  anexoId: string;
  titulo: string;
  nomeArquivo?: string;
}

/**
 * Dialog leve para abrir o PDF de um ofício a partir de uma lista (cards/tabela),
 * sem precisar navegar até o detalhe da solicitação. Reaproveita o app-pdf-viewer
 * já usado em Protocolar Ofício e no Detalhe da Solicitação.
 */
@Component({
  selector: 'app-pdf-viewer-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule, PdfViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pdf-viewer-dialog.component.html',
  styleUrl: './pdf-viewer-dialog.component.scss',
})
export class PdfViewerDialogComponent {
  private readonly ref = inject(MatDialogRef<PdfViewerDialogComponent>);
  readonly data = inject<PdfViewerDialogData>(MAT_DIALOG_DATA);

  fechar(): void {
    this.ref.close();
  }
}

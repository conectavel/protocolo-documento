import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AnexosService } from '../../../core/services/anexos.service';

/**
 * Visualizador de PDF embutido (Abrir em nova aba / Baixar / Remover), usado tanto no
 * upload do ofício (Protocolar Ofício) quanto na exibição do documento já anexado
 * (Detalhe da Solicitação). O PDF é buscado como Blob autenticado (o endpoint exige
 * Bearer token, que um <iframe>/<a> apontando direto para a API não conseguiria enviar)
 * e exibido via URL de objeto local — o navegador renderiza seu próprio visualizador
 * nativo de PDF dentro do <iframe> (zoom, paginação, rotação, impressão).
 */
@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pdf-viewer.component.html',
  styleUrl: './pdf-viewer.component.scss',
})
export class PdfViewerComponent {
  private readonly anexosService = inject(AnexosService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly anexoId = input.required<string>();
  readonly nomeArquivo = input<string>('ofício.pdf');
  readonly podeRemover = input<boolean>(false);
  readonly altura = input<string>('420px');

  readonly remover = output<void>();

  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);
  readonly urlVisualizacao = signal<SafeResourceUrl | null>(null);

  private blobUrlBruta: string | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.revogarUrl());
    effect(() => {
      const id = this.anexoId();
      if (id) {
        this.carregarPdf(id);
      }
    });
  }

  private carregarPdf(anexoId: string): void {
    this.revogarUrl();
    this.carregando.set(true);
    this.erro.set(null);
    this.urlVisualizacao.set(null);

    this.anexosService.baixarComoBlob(anexoId, true).subscribe({
      next: (blob) => {
        this.blobUrlBruta = URL.createObjectURL(blob);
        this.urlVisualizacao.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrlBruta));
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
        this.erro.set('Não foi possível carregar o PDF para visualização.');
      },
    });
  }

  abrirNovaAba(): void {
    if (this.blobUrlBruta) {
      window.open(this.blobUrlBruta, '_blank');
    }
  }

  baixar(): void {
    if (!this.blobUrlBruta) return;
    const link = document.createElement('a');
    link.href = this.blobUrlBruta;
    link.download = this.nomeArquivo();
    link.click();
  }

  private revogarUrl(): void {
    if (this.blobUrlBruta) {
      URL.revokeObjectURL(this.blobUrlBruta);
      this.blobUrlBruta = null;
    }
  }
}

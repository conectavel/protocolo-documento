import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PreProtocolosService } from '../../core/services/pre-protocolos.service';
import { PreProtocolo } from '../../core/models';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PdfViewerComponent } from '../../shared/components/pdf-viewer/pdf-viewer.component';
import {
  MotivoDialogComponent,
} from '../detalhe-solicitacao/dialogs/motivo-dialog.component';

/**
 * Pré Protocolo — solicitações recebidas por e-mail (superintendencia@senar-go.com.br)
 * aguardando revisão do Assessor antes de virarem um Protocolo de Ofício formal.
 * Acesso restrito a Assessor/Admin (RBAC aplicado no backend — PreProtocolosService).
 */
@Component({
  selector: 'app-pre-protocolo-lista',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    LoadingStateComponent,
    EmptyStateComponent,
    PdfViewerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pre-protocolo-lista.component.html',
  styleUrl: './pre-protocolo-lista.component.scss',
})
export class PreProtocoloListaComponent implements OnInit {
  private readonly preProtocolosService = inject(PreProtocolosService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly carregando = signal(true);
  readonly registros = signal<PreProtocolo[]>([]);

  readonly pendentes = computed(() => this.registros().filter((r) => r.status === 'PENDENTE'));

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.preProtocolosService.listar().subscribe({
      next: (lista) => {
        this.registros.set(lista);
        this.carregando.set(false);
      },
      error: () => {
        this.registros.set([]);
        this.carregando.set(false);
      },
    });
  }

  converter(preProtocolo: PreProtocolo): void {
    this.router.navigate(['/pre-protocolo', preProtocolo.id, 'converter']);
  }

  descartar(preProtocolo: PreProtocolo): void {
    const ref = this.dialog.open(MotivoDialogComponent, {
      data: {
        titulo: 'Descartar pré-protocolo',
        subtitulo: 'Explique por que este e-mail não vai virar um protocolo de ofício.',
        rotuloConfirmar: 'Descartar',
        corConfirmar: 'warn',
      },
    });
    ref.afterClosed().subscribe((motivo) => {
      if (motivo === undefined) return;
      this.preProtocolosService.descartar(preProtocolo.id, motivo).subscribe({
        next: () => {
          this.snackBar.open('Pré-protocolo descartado.', 'Ok', { duration: 3000 });
          this.carregar();
        },
        error: () => this.snackBar.open('Não foi possível descartar.', 'Ok', { duration: 4000 }),
      });
    });
  }
}

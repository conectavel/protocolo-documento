import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlertaService } from '../../core/services/alerta.service';
import { PreProtocolosService } from '../../core/services/pre-protocolos.service';
import { AnexosService } from '../../core/services/anexos.service';
import { PreProtocolo, SolicitanteTipo, STATUS_MACRO_LABELS, StatusPreProtocolo } from '../../core/models';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PdfViewerDialogComponent } from '../../shared/components/pdf-viewer-dialog/pdf-viewer-dialog.component';
import {
  MotivoDialogComponent,
} from '../detalhe-solicitacao/dialogs/motivo-dialog.component';

type AbaPreProtocolo = 'ENTRADA' | 'INICIADOS';

/**
 * Pré Protocolo — solicitações recebidas por e-mail (superintendencia@senar-go.com.br)
 * aguardando revisão do Assessor antes de virarem um Protocolo de Ofício formal.
 * Duas abas: "Entrada por E-mail" (pendentes de decisão, ou já descartados) e
 * "Protocolos Iniciados" (já convertidos em um Protocolo de verdade) — cada uma com
 * busca por remetente/assunto, período de recebimento e paginação, igual ao Painel
 * de Ofícios. Acesso restrito a Assessor/Admin (RBAC aplicado no backend).
 */
@Component({
  selector: 'app-pre-protocolo-lista',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatDatepickerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatRadioModule,
    MatSelectModule,
    MatTooltipModule,
    LoadingStateComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pre-protocolo-lista.component.html',
  styleUrl: './pre-protocolo-lista.component.scss',
})
export class PreProtocoloListaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly preProtocolosService = inject(PreProtocolosService);
  private readonly anexosService = inject(AnexosService);
  private readonly dialog = inject(MatDialog);
  private readonly alerta = inject(AlertaService);
  private readonly router = inject(Router);

  readonly statusMacroLabels = STATUS_MACRO_LABELS;

  readonly abas: { chave: AbaPreProtocolo; rotulo: string }[] = [
    { chave: 'ENTRADA', rotulo: 'Entrada por E-mail' },
    { chave: 'INICIADOS', rotulo: 'Protocolos Iniciados' },
  ];
  readonly abaAtiva = signal<AbaPreProtocolo>('ENTRADA');

  readonly carregando = signal(true);
  readonly registros = signal<PreProtocolo[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(12);

  /** "Quem está solicitando?" escolhido em cada card sem anexo, antes de enviar o ofício — chave = id do pré-protocolo. */
  readonly solicitanteEscolhido = signal<Record<string, SolicitanteTipo>>({});
  readonly enviandoAnexo = signal<Record<string, boolean>>({});

  readonly filtros = this.fb.nonNullable.group({
    statusEntrada: 'PENDENTE' as StatusPreProtocolo,
    remetente: '',
    assunto: '',
    dataInicio: null as Date | null,
    dataFim: null as Date | null,
  });

  ngOnInit(): void {
    this.carregar();
  }

  /** Link do formulário público (sem login) — para a Assessora compartilhar com quem precisa enviar uma solicitação. */
  copiarLinkPublico(): void {
    const link = `${window.location.origin}/enviar-solicitacao`;
    navigator.clipboard
      .writeText(link)
      .then(() => this.alerta.sucesso('Link copiado! Já pode compartilhar.'))
      .catch(() => this.alerta.erro(`Não foi possível copiar automaticamente. Link: ${link}`));
  }

  selecionarAba(aba: AbaPreProtocolo): void {
    if (this.abaAtiva() === aba) return;
    this.abaAtiva.set(aba);
    this.page.set(1);
    this.carregar();
  }

  filtrar(): void {
    this.page.set(1);
    this.carregar();
  }

  limparFiltros(): void {
    this.filtros.reset({
      statusEntrada: 'PENDENTE',
      remetente: '',
      assunto: '',
      dataInicio: null,
      dataFim: null,
    });
    this.page.set(1);
    this.carregar();
  }

  aoMudarPagina(evento: PageEvent): void {
    this.page.set(evento.pageIndex + 1);
    this.pageSize.set(evento.pageSize);
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    const valores = this.filtros.getRawValue();
    const status: StatusPreProtocolo = this.abaAtiva() === 'INICIADOS' ? 'CONVERTIDO' : valores.statusEntrada;

    this.preProtocolosService
      .listar({
        status,
        remetente: valores.remetente || undefined,
        assunto: valores.assunto || undefined,
        dataInicio: valores.dataInicio ? valores.dataInicio.toISOString() : undefined,
        dataFim: valores.dataFim ? valores.dataFim.toISOString() : undefined,
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: (pagina) => {
          this.registros.set(pagina.data);
          this.total.set(pagina.total);
          this.carregando.set(false);
        },
        error: () => {
          this.registros.set([]);
          this.total.set(0);
          this.carregando.set(false);
          this.alerta.erro('Não foi possível carregar os pré-protocolos.');
        },
      });
  }

  converter(preProtocolo: PreProtocolo): void {
    this.router.navigate(['/pre-protocolo', preProtocolo.id, 'converter']);
  }

  abrirPdf(registro: PreProtocolo): void {
    if (!registro.anexoOficioId) return;
    this.dialog.open(PdfViewerDialogComponent, {
      width: '860px',
      maxWidth: '95vw',
      data: {
        anexoId: registro.anexoOficioId,
        titulo: registro.assunto,
        nomeArquivo: 'oficio.pdf',
      },
    });
  }

  escolherSolicitante(preProtocoloId: string, tipo: SolicitanteTipo): void {
    this.solicitanteEscolhido.update((atual) => ({ ...atual, [preProtocoloId]: tipo }));
  }

  /** Upload do PDF que faltava no e-mail + registro de quem está solicitando (RN: exigido antes de anexar). */
  anexarOficio(registro: PreProtocolo, input: HTMLInputElement): void {
    const arquivo = input.files?.[0];
    input.value = '';
    if (!arquivo) return;

    if (arquivo.type !== 'application/pdf') {
      this.alerta.erro('Selecione um arquivo em formato PDF.');
      return;
    }
    const solicitanteTipo = this.solicitanteEscolhido()[registro.id];
    if (!solicitanteTipo) {
      this.alerta.erro('Selecione antes quem está solicitando — Mobilizador ou Presidente do Sindicato Rural.');
      return;
    }

    this.enviandoAnexo.update((atual) => ({ ...atual, [registro.id]: true }));
    this.anexosService.enviar(arquivo, 'OFICIO').subscribe({
      next: (anexo) => {
        this.preProtocolosService.anexarOficio(registro.id, { anexoOficioId: anexo.id, solicitanteTipo }).subscribe({
          next: (atualizado) => {
            this.registros.update((lista) => lista.map((r) => (r.id === registro.id ? atualizado : r)));
            this.enviandoAnexo.update((atual) => ({ ...atual, [registro.id]: false }));
            this.alerta.sucesso('Ofício anexado com sucesso.');
          },
          error: () => {
            this.enviandoAnexo.update((atual) => ({ ...atual, [registro.id]: false }));
            this.alerta.erro('Não foi possível vincular o ofício ao pré-protocolo.');
          },
        });
      },
      error: () => {
        this.enviandoAnexo.update((atual) => ({ ...atual, [registro.id]: false }));
        this.alerta.erro('Não foi possível enviar o arquivo.');
      },
    });
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
          this.alerta.sucesso('Pré-protocolo descartado.');
          this.carregar();
        },
        error: () => this.alerta.erro('Não foi possível descartar.'),
      });
    });
  }
}

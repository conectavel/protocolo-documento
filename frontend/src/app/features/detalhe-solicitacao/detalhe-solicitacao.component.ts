import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { AuthService } from '../../core/services/auth.service';
import { ParceirosService } from '../../core/services/parceiros.service';
import { SolicitacoesService } from '../../core/services/solicitacoes.service';
import {
  AreaPrograma,
  ItemSolicitacao,
  Solicitacao,
  TIPO_ITEM_LABELS,
  Tramitacao,
} from '../../core/models';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PdfViewerComponent } from '../../shared/components/pdf-viewer/pdf-viewer.component';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from './dialogs/motivo-dialog.component';
import {
  SelecionarCoordenadorDialogComponent,
} from './dialogs/selecionar-coordenador-dialog.component';

/**
 * Detalhe da Solicitação — Template 5 (edição) + blocos de ação
 * condicionais por papel/etapa (requirements.md HU02–HU09).
 *
 * Simplificação assumida (documentada no relatório final): a etapa
 * detalhada de tramitação (`etapaAtual`) é um texto livre vindo do
 * backend, sem enum fixo no contrato. Por isso os blocos de ação usam
 * o `statusMacro` como aproximação de qual etapa está ativa; a validação
 * definitiva de pré-condição de cada transição é responsabilidade do
 * backend (design.md §3) — se a ação não for permitida, a API retorna
 * erro e a tela exibe a mensagem.
 */
@Component({
  selector: 'app-detalhe-solicitacao',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    StatusChipComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    PdfViewerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalhe-solicitacao.component.html',
  styleUrl: './detalhe-solicitacao.component.scss',
})
export class DetalheSolicitacaoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly parceirosService = inject(ParceirosService);
  private readonly solicitacoesService = inject(SolicitacoesService);
  private readonly dialog = inject(MatDialog);

  readonly tipoItemLabels = TIPO_ITEM_LABELS;
  readonly resultadosDevolutiva = [
    { valor: 'ATENDIDO', rotulo: 'Atendido' },
    { valor: 'PARCIALMENTE_ATENDIDO', rotulo: 'Parcialmente Atendido' },
    { valor: 'NAO_ATENDIDO', rotulo: 'Não Atendido' },
  ] as const;

  readonly carregando = signal(true);
  readonly solicitacao = signal<Solicitacao | null>(null);
  readonly tramitacoes = signal<Tramitacao[]>([]);
  readonly areasPrograma = signal<AreaPrograma[]>([]);
  readonly erroAcao = signal<string | null>(null);
  readonly executandoAcao = signal(false);

  readonly formulariosDevolutiva = new Map<number, FormGroup>();

  readonly usuario = this.auth.usuario;
  readonly papel = computed(() => this.auth.papel());

  readonly ehCoordenadorRegional = computed(() => this.papel() === 'COORDENADOR_REGIONAL');
  readonly ehAssessor = computed(() => this.papel() === 'ASSESSOR');
  readonly ehSuperintendente = computed(() => this.papel() === 'SUPERINTENDENTE');
  readonly ehDiretor = computed(() => this.papel() === 'DIRETOR_EDUCACIONAL');
  readonly ehGestor = computed(() => this.papel() === 'GESTOR');
  readonly ehCoordenadorArea = computed(() => this.papel() === 'COORDENADOR');
  readonly ehMobilizador = computed(() => this.papel() === 'MOBILIZADOR');

  readonly podeDarCiencia = computed(
    () =>
      this.ehCoordenadorRegional() &&
      this.solicitacao()?.statusMacro === 'EM_ANALISE_REGIONAL'
  );

  readonly podeAnalisarAssessoria = computed(
    () => this.ehAssessor() && this.solicitacao()?.statusMacro === 'EM_ANALISE_ASSESSORIA'
  );

  readonly podeDespachar = computed(
    () => this.ehSuperintendente() && this.solicitacao()?.statusMacro === 'EM_DESPACHO'
  );

  readonly podeDirecionar = computed(
    () => this.ehDiretor() && this.solicitacao()?.statusMacro === 'EM_DESPACHO'
  );

  readonly direcionarForm = this.fb.nonNullable.group({
    areaProgramaId: ['', Validators.required],
    coordenadorId: [''],
  });

  ngOnInit(): void {
    this.parceirosService.listarAreasPrograma().subscribe({
      next: (lista) => this.areasPrograma.set(lista),
      error: () => this.areasPrograma.set([]),
    });
    this.carregar();
  }

  private get solicitacaoId(): string {
    return this.route.snapshot.paramMap.get('id') as string;
  }

  carregar(): void {
    this.carregando.set(true);
    this.solicitacoesService.buscarPorId(this.solicitacaoId).subscribe({
      next: (solicitacao) => {
        this.solicitacao.set(solicitacao);
        this.carregando.set(false);
        this.carregarHistorico();
      },
      error: () => {
        this.solicitacao.set(null);
        this.carregando.set(false);
      },
    });
  }

  /**
   * HU01 — Mobilizador nunca vê a tramitação interna; para os demais papéis
   * o histórico é buscado à parte (o endpoint de detalhe não o inclui).
   */
  private carregarHistorico(): void {
    if (this.papel() === 'MOBILIZADOR') {
      this.tramitacoes.set([]);
      return;
    }
    this.solicitacoesService.buscarHistorico(this.solicitacaoId).subscribe({
      next: (tramitacoes) => this.tramitacoes.set(tramitacoes),
      error: () => this.tramitacoes.set([]),
    });
  }

  // ---------------------------------------------------------------
  // Itens — visibilidade de ações por papel (HU05–HU08)
  // ---------------------------------------------------------------

  itemPodeSerDesignado(item: ItemSolicitacao): boolean {
    const usuario = this.usuario();
    return (
      this.ehGestor() &&
      !!usuario?.areaProgramaId &&
      item.areaProgramaId === usuario.areaProgramaId &&
      !item.coordenadorId
    );
  }

  itemPodeSerAceitoOuEncaminhado(item: ItemSolicitacao): boolean {
    const usuario = this.usuario();
    return (
      this.ehCoordenadorArea() &&
      item.coordenadorId === usuario?.id &&
      item.statusItem === 'PENDENTE'
    );
  }

  itemPodeReceberDevolutiva(item: ItemSolicitacao): boolean {
    const usuario = this.usuario();
    return (
      this.ehCoordenadorArea() &&
      item.coordenadorId === usuario?.id &&
      item.statusItem === 'EM_ANALISE'
    );
  }

  coordenadoresDaArea(areaProgramaId?: string) {
    return this.areasPrograma().find((a) => a.id === areaProgramaId)?.coordenadores ?? [];
  }

  // ---------------------------------------------------------------
  // Ações de fluxo — nível da solicitação
  // ---------------------------------------------------------------

  darCiencia(): void {
    this.executarAcao(this.solicitacoesService.darCiencia(this.solicitacaoId));
  }

  aprovarAssessoria(): void {
    this.executarAcao(
      this.solicitacoesService.analisarAssessoria(this.solicitacaoId, { decisao: 'APROVAR' })
    );
  }

  devolverAssessoria(): void {
    this.abrirDialogMotivo(
      {
        titulo: 'Devolver para ajuste',
        subtitulo: 'Explique ao Mobilizador o que precisa ser complementado.',
        rotuloConfirmar: 'Devolver',
        corConfirmar: 'primary',
      },
      (motivo) =>
        this.executarAcao(
          this.solicitacoesService.analisarAssessoria(this.solicitacaoId, {
            decisao: 'DEVOLVER_AJUSTE',
            motivo,
          })
        )
    );
  }

  recusarAssessoria(): void {
    this.abrirDialogMotivo(
      {
        titulo: 'Recusar solicitação',
        subtitulo: 'Esta justificativa comporá a devolutiva final ao Mobilizador.',
        rotuloConfirmar: 'Recusar',
        corConfirmar: 'warn',
      },
      (motivo) =>
        this.executarAcao(
          this.solicitacoesService.analisarAssessoria(this.solicitacaoId, {
            decisao: 'RECUSAR',
            motivo,
          })
        )
    );
  }

  despachar(): void {
    this.executarAcao(
      this.solicitacoesService.despacharSuperintendente(this.solicitacaoId, {
        diretoriaDestino: 'EDUCACIONAL',
      })
    );
  }

  direcionar(): void {
    if (this.direcionarForm.invalid) {
      this.direcionarForm.markAllAsTouched();
      return;
    }
    const valores = this.direcionarForm.getRawValue();
    this.executarAcao(
      this.solicitacoesService.direcionarDiretor(this.solicitacaoId, {
        areaProgramaId: valores.areaProgramaId,
        coordenadorId: valores.coordenadorId || undefined,
      })
    );
  }

  // ---------------------------------------------------------------
  // Ações de fluxo — nível do item
  // ---------------------------------------------------------------

  designarCoordenador(item: ItemSolicitacao): void {
    const coordenadores = this.coordenadoresDaArea(item.areaProgramaId);
    const ref = this.dialog.open(SelecionarCoordenadorDialogComponent, {
      data: {
        titulo: 'Selecionar Coordenador',
        subtitulo: 'Escolha o coordenador responsável por este item.',
        coordenadores,
      },
      width: '640px',
    });

    ref.afterClosed().subscribe((coordenadorId) => {
      if (!coordenadorId || !item.id) {
        return;
      }
      this.executarAcao(
        this.solicitacoesService.designarCoordenador(item.id, { coordenadorId })
      );
    });
  }

  aceitarItem(item: ItemSolicitacao): void {
    if (!item.id) {
      return;
    }
    this.executarAcao(this.solicitacoesService.aceitarItem(item.id));
  }

  encaminharItem(item: ItemSolicitacao): void {
    if (!item.id) {
      return;
    }
    this.abrirDialogMotivo(
      {
        titulo: 'Encaminhar para outra gerência',
        subtitulo: 'Informe o motivo do encaminhamento.',
        rotuloConfirmar: 'Encaminhar',
      },
      (motivo) => {
        // Simplificação: reaproveita a primeira área diferente da atual
        // disponível como destino; numa tela completa, isso seria um
        // segundo campo de seleção dentro do próprio dialog.
        const areaDestino = this.areasPrograma().find((a) => a.id !== item.areaProgramaId);
        if (!areaDestino) {
          this.erroAcao.set('Não há outra área disponível para encaminhamento.');
          return;
        }
        this.executarAcao(
          this.solicitacoesService.encaminharItem(item.id as string, {
            areaProgramaId: areaDestino.id,
            motivo,
          })
        );
      }
    );
  }

  formularioDevolutiva(indice: number): FormGroup {
    let formulario = this.formulariosDevolutiva.get(indice);
    if (!formulario) {
      formulario = this.fb.nonNullable.group({
        resultado: ['ATENDIDO', Validators.required],
        justificativa: [''],
        dataEvento: [null as Date | null],
        horario: [''],
        local: [''],
        numeroEventoTurma: [''],
        numeroProcessoAceiteFluig: [''],
      });
      this.formulariosDevolutiva.set(indice, formulario);
    }
    return formulario;
  }

  registrarDevolutiva(item: ItemSolicitacao, indice: number): void {
    if (!item.id) {
      return;
    }
    const formulario = this.formularioDevolutiva(indice);
    const valores = formulario.getRawValue();

    if (valores.resultado !== 'ATENDIDO' && !valores.justificativa) {
      this.erroAcao.set('Justificativa é obrigatória quando o item não é totalmente atendido.');
      return;
    }

    this.executarAcao(
      this.solicitacoesService.registrarDevolutiva(item.id, {
        resultado: valores.resultado as 'ATENDIDO' | 'PARCIALMENTE_ATENDIDO' | 'NAO_ATENDIDO',
        justificativa: valores.justificativa || undefined,
        dataEvento: valores.dataEvento ? valores.dataEvento.toISOString() : undefined,
        horario: valores.horario || undefined,
        local: valores.local || undefined,
        numeroEventoTurma: valores.numeroEventoTurma || undefined,
        numeroProcessoAceiteFluig: valores.numeroProcessoAceiteFluig || undefined,
      })
    );
  }

  // ---------------------------------------------------------------
  // Utilitários
  // ---------------------------------------------------------------

  private abrirDialogMotivo(data: MotivoDialogData, aoConfirmar: (motivo: string) => void): void {
    const ref = this.dialog.open(MotivoDialogComponent, { data, width: '560px' });
    ref.afterClosed().subscribe((motivo) => {
      if (motivo) {
        aoConfirmar(motivo);
      }
    });
  }

  private executarAcao(observable: Observable<Solicitacao>): void {
    this.erroAcao.set(null);
    this.executandoAcao.set(true);
    observable.subscribe({
      next: (solicitacao) => {
        this.solicitacao.set(solicitacao);
        this.executandoAcao.set(false);
        this.carregarHistorico();
      },
      error: () => {
        this.executandoAcao.set(false);
        this.erroAcao.set('Não foi possível concluir a ação. Tente novamente.');
      },
    });
  }
}

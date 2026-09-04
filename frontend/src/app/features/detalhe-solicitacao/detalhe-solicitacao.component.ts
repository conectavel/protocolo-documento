import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AlertaService } from '../../core/services/alerta.service';
import { AuthService } from '../../core/services/auth.service';
import { ParceirosService } from '../../core/services/parceiros.service';
import { SolicitacoesService } from '../../core/services/solicitacoes.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import {
  AnexoProcesso,
  AreaPrograma,
  ItemExcluidoRequest,
  ItemSolicitacao,
  PAPEIS_PARCEIRO,
  PAPEL_LABELS,
  Solicitacao,
  TIPO_ITEM_LABELS,
  TipoItem,
  Tramitacao,
  UsuarioResumo,
} from '../../core/models';
import { StatusChipComponent } from '../../shared/components/status-chip/status-chip.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PdfViewerComponent } from '../../shared/components/pdf-viewer/pdf-viewer.component';
import { PdfViewerDialogComponent } from '../../shared/components/pdf-viewer-dialog/pdf-viewer-dialog.component';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from './dialogs/motivo-dialog.component';
import {
  SelecionarCoordenadorDialogComponent,
} from './dialogs/selecionar-coordenador-dialog.component';
import {
  SelecionarAreaDialogComponent,
} from './dialogs/selecionar-area-dialog.component';
import {
  EditarItemDialogComponent,
} from './dialogs/editar-item-dialog.component';
import {
  ConfirmarAcaoDialogComponent,
} from '../../shared/components/confirmar-acao-dialog/confirmar-acao-dialog.component';

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
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
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
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly alerta = inject(AlertaService);

  readonly tipoItemLabels = TIPO_ITEM_LABELS;
  readonly tipoItemIcones: Record<TipoItem, string> = {
    ACAO_ATIVIDADE: 'event',
    PATROCINIO: 'volunteer_activism',
    SOLICITACAO_ITENS: 'inventory_2',
    CONVITE: 'mail',
  };
  readonly turnoLabels: Record<string, string> = {
    MANHA: 'Manhã',
    TARDE: 'Tarde',
    NOITE: 'Noite',
    INTEGRAL: 'Integral',
  };
  readonly tipoAnexoLabels: Record<string, string> = {
    OFICIO: 'Ofício',
    DEVOLUTIVA: 'Devolutiva',
    OUTRO: 'Outro',
  };
  readonly papelLabels = PAPEL_LABELS;
  readonly acaoTramitacaoLabels: Record<string, string> = {
    CIENCIA: 'Ciência',
    CIENCIA_AUTOMATICA: 'Ciência automática',
    APROVAR: 'Aprovar',
    DEVOLVER_AJUSTE: 'Devolver para Ajuste',
    RECUSAR: 'Recusar',
    DESPACHAR: 'Despachar',
    DIRECIONAR: 'Direcionar',
    DESIGNAR_COORDENADOR: 'Designar Coordenador',
    ACEITAR: 'Aceitar',
    ENCAMINHAR_OUTRA_AREA: 'Encaminhar para Outra Área',
    REGISTRAR_DEVOLUTIVA: 'Registrar Devolutiva',
    REENVIAR_APOS_AJUSTE: 'Reenviar Após Ajuste',
    EDITAR_ITEM: 'Editar Item',
    EXCLUIR_ITEM_DO_FLUXO: 'Excluir Item do Fluxo',
  };
  readonly resultadosDevolutiva = [
    { valor: 'ATENDIDO', rotulo: 'Atendido' },
    { valor: 'PARCIALMENTE_ATENDIDO', rotulo: 'Parcialmente Atendido' },
    { valor: 'NAO_ATENDIDO', rotulo: 'Não Atendido' },
  ] as const;

  readonly carregando = signal(true);
  readonly solicitacao = signal<Solicitacao | null>(null);
  readonly tramitacoes = signal<Tramitacao[]>([]);
  readonly anexosProcesso = signal<AnexoProcesso[]>([]);
  readonly areasPrograma = signal<AreaPrograma[]>([]);
  readonly diretores = signal<UsuarioResumo[]>([]);
  readonly erroAcao = signal<string | null>(null);
  readonly executandoAcao = signal(false);

  readonly formulariosDevolutiva = new Map<number, FormGroup>();

  /**
   * "Atender" por item (HU03/HU04) — a Assessoria (ao aprovar) e o
   * Superintendente (ao despachar) podem desmarcar itens que não vão avançar
   * pelo fluxo das áreas; todo item pendente começa marcado (comportamento
   * atual, sem mudança, é o padrão).
   */
  readonly itensParaAtender = signal<Set<string>>(new Set());

  /** Devolutiva/observação opcional escrita por quem excluiu cada item não atendido do fluxo. */
  readonly observacoesItensExcluidos = signal<Map<string, string>>(new Map());

  readonly usuario = this.auth.usuario;
  readonly papel = computed(() => this.auth.papel());

  readonly ehCoordenadorRegional = computed(() => this.papel() === 'COORDENADOR_REGIONAL');
  readonly ehAssessor = computed(() => this.papel() === 'ASSESSOR');
  readonly ehSuperintendente = computed(() => this.papel() === 'SUPERINTENDENTE');
  readonly ehDiretor = computed(() => this.papel() === 'DIRETOR_EDUCACIONAL');
  readonly ehGestor = computed(() => this.papel() === 'GESTOR');
  readonly ehCoordenadorArea = computed(() => this.papel() === 'COORDENADOR');
  // Presidente do Sindicato tem a mesma autonomia do Mobilizador (pedido do cliente).
  readonly ehMobilizador = computed(() => {
    const papel = this.papel();
    return !!papel && PAPEIS_PARCEIRO.includes(papel);
  });

  /**
   * Devolutiva Global (HU09) — um veredito único para a solicitação inteira,
   * calculado a partir da devolutiva de cada item. Só faz sentido mostrá-la
   * quando TODOS os itens já foram resolvidos; o detalhe de cada um continua
   * visível dentro do próprio box em "Itens da Solicitação".
   */
  readonly temDevolutivaGlobal = computed(() => {
    const itens = this.solicitacao()?.itens ?? [];
    return itens.length > 0 && itens.every((item) => !!item.devolutiva);
  });

  readonly contagemDevolutiva = computed(() => {
    const itens = this.solicitacao()?.itens ?? [];
    return itens.reduce(
      (acc, item) => {
        switch (item.devolutiva?.resultado) {
          case 'ATENDIDO':
            acc.atendido++;
            break;
          case 'PARCIALMENTE_ATENDIDO':
            acc.parcial++;
            break;
          case 'NAO_ATENDIDO':
            acc.naoAtendido++;
            break;
        }
        return acc;
      },
      { atendido: 0, parcial: 0, naoAtendido: 0 }
    );
  });

  readonly resultadoGlobalTom = computed((): 'success' | 'warning' | 'neutral' => {
    const { atendido, parcial, naoAtendido } = this.contagemDevolutiva();
    if (parcial === 0 && naoAtendido === 0) return 'success';
    if (atendido === 0 && parcial === 0) return 'neutral';
    return 'warning';
  });

  readonly resultadoGlobalLabel = computed(() => {
    switch (this.resultadoGlobalTom()) {
      case 'success':
        return 'Totalmente Atendido';
      case 'neutral':
        return 'Não Atendido';
      default:
        return 'Parcialmente Atendido';
    }
  });

  // ---------------------------------------------------------------
  // Stepper de etapas (HU01) — Mobilizador/Presidente veem só o macro
  // (Iniciado/Em Análise/Concluído); os demais papéis veem o fluxo completo,
  // derivado de statusMacro + etapaAtual (só presente para papéis internos).
  // ---------------------------------------------------------------

  private readonly etapasSimplificadas = ['Iniciado', 'Em Análise', 'Concluído'];
  private readonly etapasCompletas = [
    'Iniciado',
    'Coord. Regional',
    'Assessor(a)',
    'Superintendente',
    'Diretor',
    'Gerente',
    'Coordenador',
    'Concluído',
  ];

  readonly cancelado = computed(() => this.solicitacao()?.statusMacro === 'CANCELADO');

  readonly etapasStepper = computed(() =>
    this.ehMobilizador() ? this.etapasSimplificadas : this.etapasCompletas
  );

  readonly indiceEtapaAtual = computed((): number => {
    const sol = this.solicitacao();
    if (!sol) return 0;
    const status = sol.statusMacro;
    const finalizados: string[] = ['ATENDIDO', 'PARCIALMENTE_ATENDIDO', 'NAO_ATENDIDO'];

    if (this.ehMobilizador()) {
      if (status === 'CANCELADO') return 1;
      if (finalizados.includes(status)) return 2;
      return 1;
    }

    if (status === 'CANCELADO') return 2; // a recusa só acontece na etapa da Assessoria
    if (finalizados.includes(status)) return 7;
    if (status === 'EM_ANALISE_REGIONAL') return 1;
    if (status === 'EM_ANALISE_ASSESSORIA' || status === 'DEVOLVIDO_AJUSTE') return 2;
    if (status === 'EM_DESPACHO') return 3;
    if (status === 'EM_EXECUCAO') {
      const etapa = sol.etapaAtual ?? '';
      if (etapa.includes('Diretor Educacional')) return 4;
      if (etapa.includes('Aguardando designação do Gestor')) return 5;
      return 6;
    }
    return 0;
  });

  etapaConcluida(indice: number): boolean {
    const atual = this.indiceEtapaAtual();
    const ultima = this.etapasStepper().length - 1;
    if (this.cancelado()) return indice < atual;
    return indice < atual || (indice === ultima && atual === ultima);
  }

  etapaAtiva(indice: number): boolean {
    if (this.cancelado()) return false;
    const ultima = this.etapasStepper().length - 1;
    return indice === this.indiceEtapaAtual() && indice !== ultima;
  }

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

  readonly despacharForm = this.fb.nonNullable.group({
    diretoresIds: [[] as string[], Validators.required],
  });

  ngOnInit(): void {
    this.parceirosService.listarAreasPrograma().subscribe({
      next: (lista) => this.areasPrograma.set(lista),
      error: () => this.areasPrograma.set([]),
    });
    if (this.ehSuperintendente()) {
      this.usuariosService.listarPorPapel('DIRETOR_EDUCACIONAL').subscribe({
        next: (lista) => this.diretores.set(lista),
        error: () => this.diretores.set([]),
      });
    }
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
        this.itensParaAtender.set(
          new Set(
            solicitacao.itens
              .filter((item) => item.statusItem === 'PENDENTE')
              .map((item) => item.id)
              .filter((id): id is string => !!id)
          )
        );
        this.carregando.set(false);
        this.carregarHistorico();
        this.carregarAnexos();
      },
      error: () => {
        this.solicitacao.set(null);
        this.carregando.set(false);
      },
    });
  }

  /**
   * HU01 — a visualização do Mobilizador/Presidente (mesma autonomia) fica
   * restrita ao status e à devolutiva final; as abas "Aprovações" (este
   * histórico) e "Anexos" não fazem parte do que volta para eles — para os
   * demais papéis são buscadas à parte (o endpoint de detalhe não as inclui).
   */
  private carregarHistorico(): void {
    if (this.ehMobilizador()) {
      this.tramitacoes.set([]);
      return;
    }
    this.solicitacoesService.buscarHistorico(this.solicitacaoId).subscribe({
      next: (tramitacoes) => this.tramitacoes.set(tramitacoes),
      error: () => this.tramitacoes.set([]),
    });
  }

  private carregarAnexos(): void {
    if (this.ehMobilizador()) {
      this.anexosProcesso.set([]);
      return;
    }
    this.solicitacoesService.buscarAnexos(this.solicitacaoId).subscribe({
      next: (anexos) => this.anexosProcesso.set(anexos),
      error: () => this.anexosProcesso.set([]),
    });
  }

  formatarTamanho(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  abrirAnexo(anexo: AnexoProcesso): void {
    this.dialog.open(PdfViewerDialogComponent, {
      width: '860px',
      maxWidth: '95vw',
      data: {
        anexoId: anexo.id,
        titulo: anexo.nomeArquivo,
        nomeArquivo: anexo.nomeArquivo,
      },
    });
  }

  /** Iniciais para o avatar no histórico de tramitação (ex.: "Maria Silva" → "MS"). */
  iniciaisDe(nome?: string): string {
    const partes = nome?.trim().split(/\s+/) ?? [];
    if (partes.length === 0 || !partes[0]) return '?';
    const primeira = partes[0][0];
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  }

  /** mailto: pronto para responder o e-mail que originou este protocolo (Pré Protocolo). */
  linkResponderEmailOrigem(sol: Solicitacao): string {
    const assunto = encodeURIComponent(`Re: ${sol.assunto}`);
    const corpo = encodeURIComponent(
      `Prezado(a),\n\nEm resposta ao seu e-mail referente ao protocolo ${sol.numeroDocumento ?? ''}...\n`
    );
    return `mailto:${sol.emailRemetenteOrigem}?subject=${assunto}&body=${corpo}`;
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

  /**
   * O Coordenador pode corrigir os campos de Ação/Atividade preenchidos pelo
   * Mobilizador/Presidente — o original fica só no histórico discreto do card
   * (ver `itemFoiEditado`/`toggleHistoricoItem`), o que vale é sempre o atual.
   */
  itemPodeSerEditado(item: ItemSolicitacao): boolean {
    const usuario = this.usuario();
    return (
      this.ehCoordenadorArea() &&
      item.tipo === 'ACAO_ATIVIDADE' &&
      item.coordenadorId === usuario?.id &&
      !item.devolutiva
    );
  }

  itemFoiEditado(item: ItemSolicitacao): boolean {
    const original = item.valoresOriginais;
    if (!original) return false;
    return (
      (original.tipoEvento ?? '') !== (item.tipoEvento ?? '') ||
      (original.acaoAtividade ?? '') !== (item.acaoAtividade ?? '') ||
      (original.disciplina ?? '') !== (item.disciplina ?? '') ||
      (original.turno ?? '') !== (item.turno ?? '') ||
      (original.dataInicio ?? '') !== (item.dataInicio ?? '') ||
      (original.dataFim ?? '') !== (item.dataFim ?? '')
    );
  }

  readonly itensComHistoricoAberto = signal<Set<number>>(new Set());

  historicoItemAberto(indice: number): boolean {
    return this.itensComHistoricoAberto().has(indice);
  }

  toggleHistoricoItem(indice: number): void {
    this.itensComHistoricoAberto.update((atual) => {
      const novo = new Set(atual);
      novo.has(indice) ? novo.delete(indice) : novo.add(indice);
      return novo;
    });
  }

  editarItem(item: ItemSolicitacao): void {
    const ref = this.dialog.open(EditarItemDialogComponent, {
      data: {
        item,
        turnoLabels: this.turnoLabels,
        turnos: ['MANHA', 'TARDE', 'NOITE', 'INTEGRAL'],
      },
      width: '600px',
    });

    ref.afterClosed().subscribe((resultado) => {
      if (!resultado || !item.id) {
        return;
      }
      this.executarAcao(this.solicitacoesService.editarItem(item.id, resultado), 'Item atualizado com sucesso.');
    });
  }

  // ---------------------------------------------------------------
  // Ações de fluxo — nível da solicitação
  // ---------------------------------------------------------------

  darCiencia(): void {
    this.executarAcao(this.solicitacoesService.darCiencia(this.solicitacaoId), 'Ciência registrada com sucesso.');
  }

  itemMarcadoParaAtender(itemId?: string): boolean {
    return !!itemId && this.itensParaAtender().has(itemId);
  }

  /** Mostra a caixinha "Atender" só para quem está decidindo agora (Assessoria ou Superintendência). */
  podeMarcarAtenderItem(item: ItemSolicitacao): boolean {
    return (
      item.statusItem === 'PENDENTE' &&
      ((this.ehAssessor() && this.podeAnalisarAssessoria()) ||
        (this.ehSuperintendente() && this.podeDespachar()))
    );
  }

  /** Prévia visual imediata de que este item não vai avançar, antes mesmo de confirmar a ação. */
  itemDesmarcadoPreview(item: ItemSolicitacao): boolean {
    return this.podeMarcarAtenderItem(item) && !this.itemMarcadoParaAtender(item.id);
  }

  /**
   * Convite (HU03) é exclusivo da Assessoria — ela fala direto com o
   * Superintendente e decide ali mesmo se atende ou não, sem passar pelo
   * resto do fluxo (Diretor/Gestor/Coordenador) de qualquer forma. Por isso a
   * devolutiva é obrigatória nos dois casos, não só quando desmarcado.
   */
  itemConviteRequerDevolutiva(item: ItemSolicitacao): boolean {
    return item.tipo === 'CONVITE' && this.ehAssessor() && this.podeAnalisarAssessoria() && item.statusItem === 'PENDENTE';
  }

  /** Convite mostra a caixa de devolutiva sempre (atendendo ou não); os demais, só quando desmarcados. */
  itemPrecisaDeObservacaoExclusao(item: ItemSolicitacao): boolean {
    return this.itemDesmarcadoPreview(item) || this.itemConviteRequerDevolutiva(item);
  }

  toggleAtenderItem(itemId?: string): void {
    if (!itemId) return;
    this.itensParaAtender.update((atual) => {
      const novo = new Set(atual);
      novo.has(itemId) ? novo.delete(itemId) : novo.add(itemId);
      return novo;
    });
  }

  /** Devolutiva/observação que quem está excluindo o item pode escrever, explicando o motivo. */
  observacaoItemExcluido(itemId?: string): string {
    if (!itemId) return '';
    return this.observacoesItensExcluidos().get(itemId) ?? '';
  }

  definirObservacaoItemExcluido(itemId: string | undefined, valor: string): void {
    if (!itemId) return;
    this.observacoesItensExcluidos.update((atual) => {
      const novo = new Map(atual);
      novo.set(itemId, valor);
      return novo;
    });
  }

  /**
   * Itens que a Assessoria/Superintendência resolvem diretamente, sem passar
   * pelo resto do fluxo: os desmarcados de "Atender" (viram Não Atendido) e,
   * exclusivamente para a Assessoria, os Convites — atendendo (marcados) ou
   * não (desmarcados), sempre com uma devolutiva.
   */
  private itensExcluidosDoFluxo(): ItemExcluidoRequest[] {
    const marcados = this.itensParaAtender();
    const observacoes = this.observacoesItensExcluidos();
    return (this.solicitacao()?.itens ?? [])
      .filter((item) => item.statusItem === 'PENDENTE' && !!item.id)
      .filter((item) => !marcados.has(item.id as string) || this.itemConviteRequerDevolutiva(item))
      .map((item) => {
        const atendido = this.itemConviteRequerDevolutiva(item) && marcados.has(item.id as string);
        return {
          itemId: item.id as string,
          observacao: observacoes.get(item.id as string)?.trim() || undefined,
          resultado: atendido ? ('ATENDIDO' as const) : undefined,
        };
      });
  }

  /** Convites (Assessoria) exigem devolutiva nos dois sentidos — bloqueia o Aprovar até todos terem uma. */
  private conviteSemDevolutiva(): ItemSolicitacao | undefined {
    const observacoes = this.observacoesItensExcluidos();
    return (this.solicitacao()?.itens ?? []).find(
      (item) => this.itemConviteRequerDevolutiva(item) && !observacoes.get(item.id as string)?.trim()
    );
  }

  aprovarAssessoria(): void {
    const conviteFaltando = this.conviteSemDevolutiva();
    if (conviteFaltando) {
      this.alerta.erro(
        `Registre a devolutiva do Convite "${conviteFaltando.titulo || conviteFaltando.acaoAtividade}" antes de aprovar.`
      );
      return;
    }

    const ref = this.dialog.open(ConfirmarAcaoDialogComponent, {
      data: {
        titulo: 'Aprovar e prosseguir?',
        mensagem: 'A solicitação será encaminhada ao Superintendente para despacho. Esta ação não pode ser desfeita.',
        rotuloConfirmar: 'Aprovar / Prosseguir',
        corConfirmar: 'primary',
        icone: 'check_circle',
        campoObservacao: {
          rotulo: 'Observação (opcional)',
          placeholder: 'Alguma observação sobre esta aprovação para constar no histórico?',
        },
        avisoNotificacao: true,
      },
      width: '420px',
    });

    ref.afterClosed().subscribe((resultado) => {
      if (!resultado) {
        return;
      }
      const observacao = typeof resultado === 'object' ? resultado.observacao : undefined;
      this.executarAcao(
        this.solicitacoesService.analisarAssessoria(this.solicitacaoId, {
          decisao: 'APROVAR',
          motivo: observacao,
          itensExcluidos: this.itensExcluidosDoFluxo(),
        }),
        'Solicitação aprovada e encaminhada ao Superintendente.'
      );
    });
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
          }),
          'Solicitação devolvida para ajuste do Mobilizador.'
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
          }),
          'Solicitação recusada.'
        )
    );
  }

  despachar(): void {
    if (this.despacharForm.invalid) {
      this.despacharForm.markAllAsTouched();
      this.erroAcao.set('Selecione ao menos um Diretor responsável antes de despachar.');
      return;
    }
    const valores = this.despacharForm.getRawValue();
    this.executarAcao(
      this.solicitacoesService.despacharSuperintendente(this.solicitacaoId, {
        diretoriaDestino: 'EDUCACIONAL',
        diretoresIds: valores.diretoresIds,
        itensExcluidos: this.itensExcluidosDoFluxo(),
      }),
      'Solicitação despachada para os Diretores selecionados.'
    );
  }

  // ---------------------------------------------------------------
  // Ações de fluxo — nível do item
  // ---------------------------------------------------------------

  /**
   * HU05 — só os Diretores escolhidos pelo Superintendente no despacho podem
   * direcionar; cada item é roteado individualmente (bifurcação), então um
   * item já com área definida não aparece mais para direcionamento.
   */
  itemPodeSerDirecionado(item: ItemSolicitacao): boolean {
    const usuario = this.usuario();
    const diretoresDesignados = this.solicitacao()?.diretoresDesignadosIds ?? [];
    return (
      this.ehDiretor() &&
      item.statusItem === 'PENDENTE' &&
      !item.areaProgramaId &&
      !!usuario?.id &&
      diretoresDesignados.includes(usuario.id)
    );
  }

  /**
   * "Análise e Providência" — assim que o Diretor direciona (ou não há mais o
   * que direcionar, porque o item já foi excluído do fluxo antes de chegar
   * aqui) TODOS os itens ainda pendentes, o botão fica em destaque confirmando
   * que o trabalho dele aqui terminou e a solicitação segue para os Gestores.
   */
  readonly todosItensDirecionados = computed(() => {
    const itens = this.solicitacao()?.itens ?? [];
    return itens.length > 0 && itens.every((item) => !!item.areaProgramaId || item.statusItem !== 'PENDENTE');
  });

  confirmarAnaliseProvidencia(): void {
    this.alerta.sucesso('Direcionamento concluído — a solicitação segue em Análise e Providência pelos Gestores.');
    this.router.navigate(['/painel']);
  }

  direcionarItem(item: ItemSolicitacao): void {
    const ref = this.dialog.open(SelecionarAreaDialogComponent, {
      data: {
        titulo: 'Direcionar item',
        subtitulo: 'Escolha o Gerente/Área responsável por este item (e, se já souber, o Coordenador).',
        areas: this.areasPrograma(),
        tipoEvento: item.tipoEvento,
      },
      width: '480px',
    });

    ref.afterClosed().subscribe((resultado) => {
      if (!resultado || !item.id) {
        return;
      }
      this.executarAcao(
        this.solicitacoesService.direcionarItem(item.id, {
          areaProgramaId: resultado.areaProgramaId,
          coordenadorId: resultado.coordenadorId,
          observacao: resultado.observacao,
        }),
        'Item direcionado com sucesso.'
      );
    });
  }

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
        this.solicitacoesService.designarCoordenador(item.id, { coordenadorId }),
        'Coordenador designado com sucesso.'
      );
    });
  }

  aceitarItem(item: ItemSolicitacao): void {
    if (!item.id) {
      return;
    }
    this.executarAcao(this.solicitacoesService.aceitarItem(item.id), 'Item aceito para atendimento.');
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
          }),
          'Item encaminhado para outra gerência.'
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
        numeroEventoTurma: valores.numeroEventoTurma || undefined,
        numeroProcessoAceiteFluig: valores.numeroProcessoAceiteFluig || undefined,
      }),
      'Devolutiva registrada com sucesso.'
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

  private executarAcao(observable: Observable<Solicitacao>, mensagemSucesso = 'Ação registrada com sucesso.'): void {
    this.erroAcao.set(null);
    this.executandoAcao.set(true);
    observable.subscribe({
      next: (solicitacao) => {
        this.solicitacao.set(solicitacao);
        this.executandoAcao.set(false);
        this.carregarHistorico();
        this.alerta.sucesso(mensagemSucesso);
      },
      error: () => {
        this.executandoAcao.set(false);
        const mensagem = 'Não foi possível concluir a ação. Tente novamente.';
        this.erroAcao.set(mensagem);
        this.alerta.erro(mensagem);
      },
    });
  }
}

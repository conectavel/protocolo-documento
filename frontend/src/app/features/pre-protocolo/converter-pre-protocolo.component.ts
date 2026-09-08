import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AlertaService } from '../../core/services/alerta.service';
import { PreProtocolosService } from '../../core/services/pre-protocolos.service';
import { ParceirosService } from '../../core/services/parceiros.service';
import { SolicitacoesService } from '../../core/services/solicitacoes.service';
import { AnexosService } from '../../core/services/anexos.service';
import { MunicipiosService } from '../../core/services/municipios.service';
import {
  ItemSolicitacao,
  Municipio,
  Parceiro,
  PreProtocolo,
  TIPO_ITEM_LABELS,
  TipoItem,
  URGENCIA_LABELS,
  Urgencia,
} from '../../core/models';
import { PdfViewerComponent } from '../../shared/components/pdf-viewer/pdf-viewer.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { CATALOGO_TIPOS_EVENTO } from '../../core/catalogos/catalogo-tipos-evento';
import { CATALOGO_UF } from '../../core/catalogos/catalogo-uf';
import {
  ConfirmarAcaoDialogComponent,
} from '../../shared/components/confirmar-acao-dialog/confirmar-acao-dialog.component';

const TIPOS_COM_TITULO: TipoItem[] = ['PATROCINIO', 'SOLICITACAO_ITENS', 'CONVITE'];
const LIMITE_OPCOES_AUTOCOMPLETE = 60;

/**
 * Converter Pré Protocolo em Protocolo de Ofício — o Assessor confirma/completa os
 * dados extraídos do e-mail (Parceiro, Mobilizador, itens) antes de gerar a solicitação
 * de verdade (reaproveita SolicitacoesService.criar no backend).
 */
@Component({
  selector: 'app-converter-pre-protocolo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    PdfViewerComponent,
    LoadingStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './converter-pre-protocolo.component.html',
  styleUrl: './converter-pre-protocolo.component.scss',
})
export class ConverterPreProtocoloComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly preProtocolosService = inject(PreProtocolosService);
  private readonly parceirosService = inject(ParceirosService);
  private readonly solicitacoesService = inject(SolicitacoesService);
  private readonly anexosService = inject(AnexosService);
  private readonly municipiosService = inject(MunicipiosService);
  private readonly dialog = inject(MatDialog);
  private readonly alerta = inject(AlertaService);

  readonly tiposItem: TipoItem[] = ['ACAO_ATIVIDADE', 'PATROCINIO', 'SOLICITACAO_ITENS', 'CONVITE'];
  readonly tipoItemLabels = TIPO_ITEM_LABELS;
  readonly tipoItemIcones: Record<TipoItem, string> = {
    ACAO_ATIVIDADE: 'event',
    PATROCINIO: 'volunteer_activism',
    SOLICITACAO_ITENS: 'inventory_2',
    CONVITE: 'mail',
  };
  readonly turnos = ['MANHA', 'TARDE', 'NOITE', 'INTEGRAL'];
  readonly turnoLabels: Record<string, string> = {
    MANHA: 'Manhã',
    TARDE: 'Tarde',
    NOITE: 'Noite',
    INTEGRAL: 'Integral',
  };
  readonly categoriasTipoEvento = CATALOGO_TIPOS_EVENTO;

  readonly carregando = signal(true);
  readonly preProtocolo = signal<PreProtocolo | null>(null);
  readonly parceiros = signal<Parceiro[]>([]);
  readonly itens = signal<ItemSolicitacao[]>([]);
  readonly erroItem = signal<string | null>(null);
  /** Índice do item em edição na lista, ou null quando "Adicionar item" cria um novo. */
  readonly editandoIndice = signal<number | null>(null);
  readonly enviando = signal(false);
  readonly erroEnvio = signal<string | null>(null);

  /**
   * Sem :id na rota (/protocolar-assessor) — o Assessor está protocolando do zero
   * em nome de um Parceiro (ex.: ofício recebido em mãos, não por e-mail), em vez
   * de confirmar um Pré-Protocolo já existente. Muda o que precisa ser carregado,
   * qual endpoint é chamado ao enviar, e as mensagens da tela.
   */
  readonly modoNovo = signal(false);

  /** Ver nota equivalente em ProtocolarOficioComponent: UF pré-selecionada como Goiás, editável. */
  readonly ufs = CATALOGO_UF;
  readonly municipios = signal<Municipio[]>([]);
  readonly carregandoMunicipios = signal(false);

  readonly urgencias: Urgencia[] = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'];
  readonly urgenciaLabels = URGENCIA_LABELS;

  // Upload manual do ofício em PDF — só existe no modo "novo" (no modo
  // "converter", o PDF já veio junto com o e-mail no Pré-Protocolo).
  readonly arquivo = signal<File | null>(null);
  readonly anexoId = signal<string | null>(null);
  readonly enviandoArquivo = signal(false);
  readonly erroArquivo = signal<string | null>(null);

  readonly documentoForm = this.fb.nonNullable.group({
    parceiroId: ['', Validators.required],
    // 1 Parceiro tem 1 ou mais Mobilizadores — o Assessor precisa escolher em
    // nome de qual deles o protocolo está sendo gerado (o e-mail recebido não
    // identifica isso).
    mobilizadorId: ['', Validators.required],
    assunto: ['', Validators.required],
    numeroDocumento: [''],
    dataDocumento: [new Date(), Validators.required],
    uf: ['GO', Validators.required],
    municipio: [''],
    resumoObservacoes: [''],
    urgencia: ['NORMAL' as Urgencia],
  });

  readonly itemForm = this.fb.nonNullable.group({
    tipo: ['ACAO_ATIVIDADE' as TipoItem, Validators.required],
    tipoEvento: [''],
    acaoAtividade: [''],
    turno: [''],
    titulo: [''],
    resumo: [''],
    dataInicio: [null as Date | null],
    dataFim: [null as Date | null],
  });

  get tipoAtualTemTitulo(): boolean {
    return TIPOS_COM_TITULO.includes(this.itemForm.controls.tipo.value);
  }

  get opcoesAcaoAtividade(): string[] {
    const categoria = this.itemForm.controls.tipoEvento.value;
    const grupo = this.categoriasTipoEvento.find((c) => c.categoria === categoria);
    if (!grupo) return [];
    const filtro = (this.itemForm.controls.acaoAtividade.value || '').trim().toLowerCase();
    const itens = filtro ? grupo.itens.filter((i) => i.toLowerCase().includes(filtro)) : grupo.itens;
    return itens.slice(0, LIMITE_OPCOES_AUTOCOMPLETE);
  }

  /** mailto: pronto para responder o remetente original, antes mesmo de decidir se converte. */
  linkResponderEmail(): string {
    const registro = this.preProtocolo();
    if (!registro) return 'mailto:';
    const assunto = encodeURIComponent(`Re: ${registro.assunto}`);
    return `mailto:${registro.remetente}?subject=${assunto}`;
  }

  get parceiroSelecionado(): Parceiro | undefined {
    return this.parceiros().find((p) => p.id === this.documentoForm.controls.parceiroId.value);
  }

  /** Opções do autocomplete de Parceiro, filtradas pelo texto digitado (lista pode ter centenas de sindicatos). */
  get opcoesParceiro(): Parceiro[] {
    const valorAtual = this.documentoForm.controls.parceiroId.value;
    const jaSelecionado = this.parceiros().some((p) => p.id === valorAtual);
    const filtro = (typeof valorAtual === 'string' ? valorAtual : '').trim().toLowerCase();
    const lista =
      jaSelecionado || !filtro ? this.parceiros() : this.parceiros().filter((p) => p.nome.toLowerCase().includes(filtro));
    return lista.slice(0, LIMITE_OPCOES_AUTOCOMPLETE);
  }

  /** [displayWith] do autocomplete de Parceiro — mostra o nome depois de selecionado, não o id. */
  readonly exibirNomeParceiro = (id: string): string => {
    return this.parceiros().find((p) => p.id === id)?.nome ?? '';
  };

  /** Opções de Município da UF selecionada, filtradas pelo texto digitado. */
  get opcoesMunicipio(): Municipio[] {
    const filtro = (this.documentoForm.controls.municipio.value || '').trim().toLowerCase();
    const lista = filtro
      ? this.municipios().filter((m) => m.nome.toLowerCase().includes(filtro))
      : this.municipios();
    return lista.slice(0, LIMITE_OPCOES_AUTOCOMPLETE);
  }

  private carregarMunicipios(uf: string): void {
    this.carregandoMunicipios.set(true);
    this.municipiosService.porUf(uf).subscribe({
      next: (lista) => {
        this.municipios.set(lista);
        this.carregandoMunicipios.set(false);
      },
      error: () => {
        this.municipios.set([]);
        this.carregandoMunicipios.set(false);
      },
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.modoNovo.set(!id);

    this.itemForm.controls.tipoEvento.valueChanges.subscribe(() => {
      this.itemForm.controls.acaoAtividade.setValue('');
    });

    this.carregarMunicipios(this.documentoForm.controls.uf.value);
    this.documentoForm.controls.uf.valueChanges.subscribe((uf) => {
      this.documentoForm.controls.municipio.setValue('');
      this.carregarMunicipios(uf);
    });

    // Trocar o Parceiro invalida o Mobilizador escolhido antes (a lista de
    // opções depende de qual Parceiro está selecionado).
    this.documentoForm.controls.parceiroId.valueChanges.subscribe(() => {
      this.documentoForm.controls.mobilizadorId.setValue('');
    });

    this.parceirosService.listar(undefined, 1, 200).subscribe({
      next: (pagina) => this.parceiros.set(pagina.data),
      error: () => this.parceiros.set([]),
    });

    if (!id) {
      this.carregando.set(false);
      return;
    }

    this.preProtocolosService.buscarPorId(id).subscribe({
      next: (registro) => {
        this.preProtocolo.set(registro);
        this.documentoForm.patchValue({
          assunto: registro.assunto,
          resumoObservacoes: registro.corpo ?? '',
        });
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
      },
    });
  }

  /** Upload manual do ofício em PDF — só usado no modo "novo" (protocolar direto). */
  selecionarArquivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0] ?? null;
    if (!arquivo) return;

    if (arquivo.type !== 'application/pdf') {
      this.erroArquivo.set('Selecione um arquivo em formato PDF.');
      return;
    }

    this.arquivo.set(arquivo);
    this.erroArquivo.set(null);
    this.enviandoArquivo.set(true);
    this.anexoId.set(null);

    this.anexosService.enviar(arquivo, 'OFICIO').subscribe({
      next: (anexo) => {
        this.anexoId.set(anexo.id);
        this.enviandoArquivo.set(false);
      },
      error: () => {
        this.enviandoArquivo.set(false);
        this.erroArquivo.set('Não foi possível enviar o ofício. Tente novamente.');
      },
    });
  }

  removerArquivo(): void {
    this.arquivo.set(null);
    this.anexoId.set(null);
    this.erroArquivo.set(null);
  }

  adicionarItem(): void {
    const valores = this.itemForm.getRawValue();
    this.erroItem.set(null);

    if (this.tipoAtualTemTitulo) {
      if (!valores.titulo) {
        this.erroItem.set('Informe o título do item.');
        return;
      }
    } else {
      if (!valores.tipoEvento) {
        this.erroItem.set('Selecione o Tipo do Evento.');
        return;
      }
      if (!valores.acaoAtividade) {
        this.erroItem.set('Informe a Ação/Atividade.');
        return;
      }
      if (!valores.turno) {
        this.erroItem.set('Selecione o Turno.');
        return;
      }
      if (!valores.dataInicio) {
        this.erroItem.set('Informe a Data Início.');
        return;
      }
      if (!valores.dataFim) {
        this.erroItem.set('Informe a Data Fim.');
        return;
      }
    }

    if (valores.dataInicio && valores.dataFim && valores.dataFim.getTime() < valores.dataInicio.getTime()) {
      this.erroItem.set('A Data Fim não pode ser anterior à Data Início.');
      return;
    }

    const item: ItemSolicitacao = {
      tipo: valores.tipo,
      dataInicio: valores.dataInicio ? valores.dataInicio.toISOString() : undefined,
      dataFim: valores.dataFim ? valores.dataFim.toISOString() : undefined,
      ...(this.tipoAtualTemTitulo
        ? { titulo: valores.titulo, resumo: valores.resumo }
        : { tipoEvento: valores.tipoEvento, acaoAtividade: valores.acaoAtividade, turno: valores.turno }),
    };

    const indiceEdicao = this.editandoIndice();
    if (indiceEdicao !== null) {
      this.itens.update((lista) => lista.map((atual, i) => (i === indiceEdicao ? item : atual)));
      this.editandoIndice.set(null);
    } else {
      this.itens.update((lista) => [...lista, item]);
    }

    this.itemForm.reset({
      tipo: valores.tipo,
      tipoEvento: '',
      acaoAtividade: '',
      turno: '',
      titulo: '',
      resumo: '',
      dataInicio: null,
      dataFim: null,
    });
  }

  /** Carrega um item já adicionado de volta no formulário para edição no lugar. */
  editarItem(indice: number): void {
    const item = this.itens()[indice];
    if (!item) return;

    this.editandoIndice.set(indice);
    this.erroItem.set(null);
    this.itemForm.reset({
      tipo: item.tipo,
      tipoEvento: item.tipoEvento ?? '',
      acaoAtividade: item.acaoAtividade ?? '',
      turno: item.turno ?? '',
      titulo: item.titulo ?? '',
      resumo: item.resumo ?? '',
      dataInicio: item.dataInicio ? new Date(item.dataInicio) : null,
      dataFim: item.dataFim ? new Date(item.dataFim) : null,
    });
  }

  cancelarEdicaoItem(): void {
    this.editandoIndice.set(null);
    this.erroItem.set(null);
    this.itemForm.reset({
      tipo: 'ACAO_ATIVIDADE',
      tipoEvento: '',
      acaoAtividade: '',
      turno: '',
      titulo: '',
      resumo: '',
      dataInicio: null,
      dataFim: null,
    });
  }

  removerItem(indice: number): void {
    this.itens.update((lista) => lista.filter((_, i) => i !== indice));

    const emEdicao = this.editandoIndice();
    if (emEdicao === indice) {
      this.cancelarEdicaoItem();
    } else if (emEdicao !== null && emEdicao > indice) {
      this.editandoIndice.set(emEdicao - 1);
    }
  }

  cancelar(): void {
    const novo = this.modoNovo();
    const ref = this.dialog.open(ConfirmarAcaoDialogComponent, {
      data: {
        titulo: novo ? 'Cancelar este protocolo?' : 'Cancelar esta conversão?',
        mensagem: novo
          ? 'As informações preenchidas até agora serão perdidas.'
          : 'As informações preenchidas até agora serão perdidas. O e-mail continua pendente em Pré-Protocolo, você pode voltar a convertê-lo depois.',
        rotuloConfirmar: 'Sim, cancelar',
        corConfirmar: 'warn',
        icone: 'delete_outline',
      },
      width: '420px',
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.router.navigate([novo ? '/painel' : '/pre-protocolo']);
      }
    });
  }

  converter(): void {
    this.erroEnvio.set(null);
    const novo = this.modoNovo();

    if (this.documentoForm.invalid) {
      this.documentoForm.markAllAsTouched();
      this.erroEnvio.set('Preencha os campos obrigatórios.');
      return;
    }
    const parceiro = this.parceiroSelecionado;
    if (!parceiro) {
      this.erroEnvio.set('Selecione um Parceiro válido na lista.');
      return;
    }
    const mobilizadorId = this.documentoForm.controls.mobilizadorId.value;
    if (!mobilizadorId) {
      this.erroEnvio.set('Selecione em nome de qual Mobilizador este protocolo está sendo gerado.');
      return;
    }

    const registro = this.preProtocolo();
    const anexoOficioId = novo ? this.anexoId() : registro?.anexoOficioId;
    if (!anexoOficioId) {
      this.erroEnvio.set(
        novo
          ? 'Anexe o ofício em PDF antes de protocolar.'
          : 'Este pré-protocolo não tem um PDF anexado — não é possível gerar o protocolo.'
      );
      return;
    }
    if (this.itens().length === 0) {
      this.erroEnvio.set('Adicione ao menos um item de solicitação.');
      return;
    }

    const valores = this.documentoForm.getRawValue();
    const mobilizadorNome = parceiro.mobilizadores?.find((m) => m.id === mobilizadorId)?.nome;

    const ref = this.dialog.open(ConfirmarAcaoDialogComponent, {
      data: {
        titulo: novo ? 'Revise antes de protocolar' : 'Revise antes de gerar o protocolo',
        mensagem: novo
          ? 'Confira se as informações abaixo estão corretas antes de protocolar em nome deste Parceiro.'
          : 'Confira se as informações abaixo estão corretas — a partir daqui, o e-mail vira um protocolo de verdade e passa a tramitar como se tivesse sido protocolado pelo próprio Mobilizador/Presidente.',
        rotuloConfirmar: novo ? 'Protocolar' : 'Gerar Protocolo',
        corConfirmar: 'primary',
        icone: 'fact_check',
        resumo: [
          { rotulo: 'Parceiro', valor: parceiro.nome },
          { rotulo: 'Mobilizador', valor: mobilizadorNome || '—' },
          { rotulo: 'Assunto', valor: valores.assunto },
          { rotulo: 'Itens', valor: `${this.itens().length}` },
        ],
      },
      width: '460px',
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      if (novo) {
        this.enviarProtocoloNovo(anexoOficioId, parceiro.id, mobilizadorId, valores);
      } else {
        this.enviarConversao(registro!.id, anexoOficioId, parceiro.id, mobilizadorId, valores);
      }
    });
  }

  private enviarConversao(
    preProtocoloId: string,
    anexoOficioId: string,
    parceiroId: string,
    mobilizadorId: string,
    valores: ReturnType<typeof this.documentoForm.getRawValue>
  ): void {
    this.enviando.set(true);

    this.preProtocolosService
      .converter(preProtocoloId, {
        parceiroId,
        mobilizadorId,
        assunto: valores.assunto,
        numeroDocumento: valores.numeroDocumento || undefined,
        dataDocumento: valores.dataDocumento.toISOString(),
        municipio: valores.municipio || undefined,
        resumoObservacoes: valores.resumoObservacoes || undefined,
        urgencia: valores.urgencia,
        anexoOficioId,
        itens: this.itens(),
      })
      .subscribe({
        next: (solicitacao) => {
          this.enviando.set(false);
          this.alerta.sucesso('Protocolo gerado com sucesso a partir do e-mail!');
          this.router.navigate(['/solicitacoes', solicitacao.id]);
        },
        error: () => {
          this.enviando.set(false);
          const mensagem = 'Não foi possível gerar o protocolo. Tente novamente.';
          this.erroEnvio.set(mensagem);
          this.alerta.erro(mensagem);
        },
      });
  }

  /** Modo "novo" (/protocolar-assessor) — Assessor protocolando direto em nome de um Parceiro, sem Pré-Protocolo de origem. */
  private enviarProtocoloNovo(
    anexoOficioId: string,
    parceiroId: string,
    mobilizadorId: string,
    valores: ReturnType<typeof this.documentoForm.getRawValue>
  ): void {
    this.enviando.set(true);

    this.solicitacoesService
      .criar({
        parceiroId,
        mobilizadorId,
        assunto: valores.assunto,
        numeroDocumento: valores.numeroDocumento || undefined,
        dataDocumento: valores.dataDocumento.toISOString(),
        municipio: valores.municipio || undefined,
        resumoObservacoes: valores.resumoObservacoes || undefined,
        urgencia: valores.urgencia,
        anexoOficioId,
        itens: this.itens(),
      })
      .subscribe({
        next: (solicitacao) => {
          this.enviando.set(false);
          this.alerta.sucesso('Ofício protocolado com sucesso!');
          this.router.navigate(['/solicitacoes', solicitacao.id]);
        },
        error: () => {
          this.enviando.set(false);
          const mensagem = 'Não foi possível protocolar o ofício. Tente novamente.';
          this.erroEnvio.set(mensagem);
          this.alerta.erro(mensagem);
        },
      });
  }
}

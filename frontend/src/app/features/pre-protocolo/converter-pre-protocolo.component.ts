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
import { ItemSolicitacao, Parceiro, PreProtocolo, TIPO_ITEM_LABELS, TipoItem } from '../../core/models';
import { PdfViewerComponent } from '../../shared/components/pdf-viewer/pdf-viewer.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { CATALOGO_TIPOS_EVENTO } from '../../core/catalogos/catalogo-tipos-evento';
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

  readonly documentoForm = this.fb.nonNullable.group({
    parceiroId: ['', Validators.required],
    // 1 Parceiro tem 1 ou mais Mobilizadores — o Assessor precisa escolher em
    // nome de qual deles o protocolo está sendo gerado (o e-mail recebido não
    // identifica isso).
    mobilizadorId: ['', Validators.required],
    assunto: ['', Validators.required],
    numeroDocumento: [''],
    dataDocumento: [new Date(), Validators.required],
    municipio: [''],
    resumoObservacoes: [''],
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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;

    this.itemForm.controls.tipoEvento.valueChanges.subscribe(() => {
      this.itemForm.controls.acaoAtividade.setValue('');
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
    const ref = this.dialog.open(ConfirmarAcaoDialogComponent, {
      data: {
        titulo: 'Cancelar esta conversão?',
        mensagem:
          'As informações preenchidas até agora serão perdidas. O e-mail continua pendente em Pré Protocolo, você pode voltar a convertê-lo depois.',
        rotuloConfirmar: 'Sim, cancelar',
        corConfirmar: 'warn',
        icone: 'delete_outline',
      },
      width: '420px',
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.router.navigate(['/pre-protocolo']);
      }
    });
  }

  converter(): void {
    this.erroEnvio.set(null);

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
    if (!registro?.anexoOficioId) {
      this.erroEnvio.set('Este pré-protocolo não tem um PDF anexado — não é possível gerar o protocolo.');
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
        titulo: 'Revise antes de gerar o protocolo',
        mensagem:
          'Confira se as informações abaixo estão corretas — a partir daqui, o e-mail vira um protocolo de verdade e passa a tramitar como se tivesse sido protocolado pelo próprio Mobilizador/Presidente.',
        rotuloConfirmar: 'Gerar Protocolo',
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
      if (confirmado) {
        this.enviarConversao(registro.id, registro.anexoOficioId as string, parceiro.id, mobilizadorId, valores);
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
}

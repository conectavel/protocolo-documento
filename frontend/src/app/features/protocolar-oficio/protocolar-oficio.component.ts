import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AlertaService } from '../../core/services/alerta.service';
import { AuthService } from '../../core/services/auth.service';
import { AnexosService } from '../../core/services/anexos.service';
import { ParceirosService } from '../../core/services/parceiros.service';
import { SolicitacoesService } from '../../core/services/solicitacoes.service';
import { MunicipiosService } from '../../core/services/municipios.service';
import { ItemSolicitacao, Municipio, Parceiro, TIPO_ITEM_LABELS, TipoItem, URGENCIA_LABELS, Urgencia } from '../../core/models';
import { PdfViewerComponent } from '../../shared/components/pdf-viewer/pdf-viewer.component';
import { CATALOGO_TIPOS_EVENTO } from '../../core/catalogos/catalogo-tipos-evento';
import { CATALOGO_UF } from '../../core/catalogos/catalogo-uf';
import {
  ConfirmarAcaoDialogComponent,
} from '../../shared/components/confirmar-acao-dialog/confirmar-acao-dialog.component';

const LIMITE_OPCOES_AUTOCOMPLETE = 60;

const TIPOS_COM_TITULO: TipoItem[] = ['PATROCINIO', 'SOLICITACAO_ITENS', 'CONVITE'];

/**
 * Protocolar Ofício — Template 5 (edição/cadastro), em 3 seções:
 * 1) Identificação do Solicitante (somente leitura, via parceiros.service)
 * 2) Dados do Documento (+ upload obrigatório do ofício em PDF)
 * 3) Tipo de Solicitação (formulário dinâmico por tipo + lista de itens)
 *
 * Acesso restrito ao papel MOBILIZADOR (roleGuard na rota).
 */
@Component({
  selector: 'app-protocolar-oficio',
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
    MatTooltipModule,
    PdfViewerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './protocolar-oficio.component.html',
  styleUrl: './protocolar-oficio.component.scss',
})
export class ProtocolarOficioComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly anexosService = inject(AnexosService);
  private readonly parceirosService = inject(ParceirosService);
  private readonly solicitacoesService = inject(SolicitacoesService);
  private readonly municipiosService = inject(MunicipiosService);
  private readonly router = inject(Router);
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

  /**
   * Catálogo de Tipo do Evento / Ação-Atividade (SENAR-GO). "Disciplina" não tem uma
   * fonte de dados equivalente ainda e fica oculta nesta tela (protocolo inicial do
   * Mobilizador) — ver documentacao/specs — evitando expor um campo livre sem apoio.
   */
  readonly categoriasTipoEvento = CATALOGO_TIPOS_EVENTO;

  readonly carregandoParceiro = signal(true);
  readonly parceiro = signal<Parceiro | null>(null);

  readonly arquivo = signal<File | null>(null);
  readonly anexoId = signal<string | null>(null);
  readonly enviandoArquivo = signal(false);
  readonly erroArquivo = signal<string | null>(null);
  readonly gerandoModelo = signal(false);

  readonly itens = signal<ItemSolicitacao[]>([]);
  readonly erroItem = signal<string | null>(null);
  /** Índice do item em edição na lista, ou null quando "Adicionar item" cria um novo. */
  readonly editandoIndice = signal<number | null>(null);

  readonly salvando = signal(false);
  readonly erroSalvar = signal<string | null>(null);

  /**
   * UF vem pré-selecionada como Goiás — todo Sindicato Rural neste sistema é do
   * SENAR-GO/FAEG, então este é sempre o valor esperado — mas continua editável
   * (o campo Município recarrega com as cidades da UF escolhida, valendo para
   * qualquer estado, não só Goiás).
   */
  readonly ufs = CATALOGO_UF;
  readonly municipios = signal<Municipio[]>([]);
  readonly carregandoMunicipios = signal(false);

  readonly urgencias: Urgencia[] = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'];
  readonly urgenciaLabels = URGENCIA_LABELS;

  readonly documentoForm = this.fb.nonNullable.group({
    assunto: ['', Validators.required],
    numeroDocumento: [''],
    dataDocumento: [null as Date | null, Validators.required],
    uf: ['GO', Validators.required],
    municipio: [''],
    resumoObservacoes: [''],
    urgencia: ['NORMAL' as Urgencia],
    // Só usado quando quem está logado é o Presidente do Sindicato — o
    // Mobilizador sempre protocola como ele mesmo (usuario.mobilizadorId).
    // 1 Parceiro tem 1 ou mais Mobilizadores, então o Presidente precisa
    // escolher em nome de qual deles está protocolando.
    mobilizadorId: [''],
  });

  readonly usuario = this.auth.usuario;
  readonly ehPresidente = computed(() => this.auth.papel() === 'PRESIDENTE');

  readonly itemForm = this.fb.nonNullable.group({
    tipo: ['ACAO_ATIVIDADE' as TipoItem, Validators.required],
    tipoEvento: [''],
    acaoAtividade: [''],
    disciplina: [''],
    turno: [''],
    titulo: [''],
    resumo: [''],
    dataInicio: [null as Date | null],
    dataFim: [null as Date | null],
    // Solicitação de Itens
    quantidade: [null as number | null],
    // Convite
    hora: [''],
    local: [''],
    responsavel: [''],
    telefone: [''],
  });

  ngOnInit(): void {
    this.carregarParceiroDoMobilizador();

    // Trocar a categoria (Tipo do Evento) invalida a Ação/Atividade escolhida antes.
    this.itemForm.controls.tipoEvento.valueChanges.subscribe(() => {
      this.itemForm.controls.acaoAtividade.setValue('');
    });

    this.carregarMunicipios(this.documentoForm.controls.uf.value);
    this.documentoForm.controls.uf.valueChanges.subscribe((uf) => {
      this.documentoForm.controls.municipio.setValue('');
      this.carregarMunicipios(uf);
    });
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

  /** Opções de Município da UF selecionada, filtradas pelo texto digitado. */
  get opcoesMunicipio(): Municipio[] {
    const filtro = (this.documentoForm.controls.municipio.value || '').trim().toLowerCase();
    const lista = filtro
      ? this.municipios().filter((m) => m.nome.toLowerCase().includes(filtro))
      : this.municipios();
    return lista.slice(0, LIMITE_OPCOES_AUTOCOMPLETE);
  }

  get tipoAtualTemTitulo(): boolean {
    return TIPOS_COM_TITULO.includes(this.itemForm.controls.tipo.value);
  }

  /** Opções de Ação/Atividade da categoria selecionada, filtradas pelo texto digitado. */
  get opcoesAcaoAtividade(): string[] {
    const categoria = this.itemForm.controls.tipoEvento.value;
    const grupo = this.categoriasTipoEvento.find((c) => c.categoria === categoria);
    if (!grupo) return [];

    const filtro = (this.itemForm.controls.acaoAtividade.value || '').trim().toLowerCase();
    const itens = filtro ? grupo.itens.filter((i) => i.toLowerCase().includes(filtro)) : grupo.itens;
    return itens.slice(0, LIMITE_OPCOES_AUTOCOMPLETE);
  }

  private carregarParceiroDoMobilizador(): void {
    const usuario = this.auth.usuario();

    // O vínculo 1 Mobilizador → 1 Parceiro (requirements.md §3) vem resolvido pelo
    // backend em `usuario.parceiroId` (a partir do rmCodigoReferencia do login —
    // ver JwtStrategy). Não há endpoint dedicado "meu parceiro"; busca-se o
    // Parceiro diretamente por esse id.
    if (!usuario?.parceiroId) {
      this.parceiro.set(null);
      this.carregandoParceiro.set(false);
      return;
    }

    this.parceirosService.buscarPorId(usuario.parceiroId).subscribe({
      next: (parceiro) => {
        this.parceiro.set(parceiro);
        this.carregandoParceiro.set(false);
      },
      error: () => {
        this.parceiro.set(null);
        this.carregandoParceiro.set(false);
      },
    });
  }

  /**
   * 1 Parceiro tem 1 ou mais Mobilizadores — o Mobilizador logado sempre
   * protocola em nome dele mesmo; o Presidente escolhe no formulário em nome
   * de qual Mobilizador do seu Parceiro está protocolando.
   */
  private resolverMobilizadorId(idSelecionado: string): string | null {
    const usuario = this.auth.usuario();
    if (usuario?.papel === 'MOBILIZADOR') {
      return usuario.mobilizadorId ?? null;
    }
    return idSelecionado || null;
  }

  private resolverMobilizadorNome(idSelecionado: string): string | undefined {
    const usuario = this.auth.usuario();
    if (usuario?.papel === 'MOBILIZADOR') {
      return usuario.nome;
    }
    return this.parceiro()?.mobilizadores?.find((m) => m.id === idSelecionado)?.nome;
  }

  /** Bloqueia letras/símbolos no campo Data do Documento — só dígitos e "/" passam. */
  bloquearTeclasInvalidasNaData(evento: KeyboardEvent): void {
    const teclasPermitidas = [
      'Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter',
    ];
    if (teclasPermitidas.includes(evento.key) || evento.ctrlKey || evento.metaKey) {
      return;
    }
    if (!/^[0-9/]$/.test(evento.key)) {
      evento.preventDefault();
    }
  }

  /** Seleciona a data de hoje diretamente no calendário aberto e fecha o seletor. */
  definirDataDocumentoHoje(picker: MatDatepicker<Date>): void {
    const hoje = new Date();
    picker.select(hoje);
    this.documentoForm.controls.dataDocumento.markAsTouched();
    picker.close();
  }

  selecionarArquivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0] ?? null;
    if (!arquivo) {
      return;
    }
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

  /**
   * Alternativa ao upload manual: gera um PDF de ofício padrão a partir do
   * que já foi preenchido (Parceiro/Presidente/Mobilizador resolvidos do RM +
   * Dados do Documento + Itens), para quando o Parceiro/Sindicato não tem um
   * documento próprio pronto para anexar.
   */
  gerarOficioComItens(): void {
    this.erroArquivo.set(null);

    const valoresDocumento = this.documentoForm.getRawValue();
    if (!valoresDocumento.assunto) {
      this.erroArquivo.set('Preencha o Assunto antes de gerar o ofício.');
      return;
    }
    if (this.itens().length === 0) {
      this.erroArquivo.set('Adicione ao menos um item antes de gerar o ofício.');
      return;
    }

    const parceiro = this.parceiro();
    this.gerandoModelo.set(true);

    this.anexosService
      .gerarModelo({
        parceiroSigla: parceiro?.nome,
        presidenteNome: parceiro?.presidenteNome,
        mobilizadorNome: this.resolverMobilizadorNome(valoresDocumento.mobilizadorId),
        cnpj: parceiro?.cnpj,
        endereco: parceiro?.endereco,
        telefone: parceiro?.telefone,
        coordenadorRegionalNome: parceiro?.coordenadorRegionalNome,
        municipio: valoresDocumento.municipio || undefined,
        assunto: valoresDocumento.assunto,
        numeroDocumento: valoresDocumento.numeroDocumento || undefined,
        dataDocumento: valoresDocumento.dataDocumento
          ? valoresDocumento.dataDocumento.toISOString()
          : undefined,
        resumoObservacoes: valoresDocumento.resumoObservacoes || undefined,
        itens: this.itens(),
      })
      .subscribe({
        next: (anexo) => {
          this.arquivo.set(null);
          this.anexoId.set(anexo.id);
          this.gerandoModelo.set(false);
        },
        error: () => {
          this.gerandoModelo.set(false);
          this.erroArquivo.set('Não foi possível gerar o ofício. Tente novamente ou anexe um PDF.');
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
      if (valores.tipo === 'SOLICITACAO_ITENS' && !valores.quantidade) {
        this.erroItem.set('Informe a quantidade.');
        return;
      }
      if (valores.tipo === 'CONVITE') {
        if (!valores.hora) {
          this.erroItem.set('Informe o horário do convite.');
          return;
        }
        if (!valores.local) {
          this.erroItem.set('Informe o Local.');
          return;
        }
        if (!valores.responsavel) {
          this.erroItem.set('Informe o Responsável.');
          return;
        }
        if (!valores.telefone) {
          this.erroItem.set('Informe o Telefone/WhatsApp do responsável.');
          return;
        }
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
        ? {
            titulo: valores.titulo,
            resumo: valores.resumo,
            ...(valores.tipo === 'SOLICITACAO_ITENS' ? { quantidade: valores.quantidade ?? undefined } : {}),
            ...(valores.tipo === 'CONVITE'
              ? {
                  hora: valores.hora,
                  local: valores.local,
                  responsavel: valores.responsavel,
                  telefone: valores.telefone,
                }
              : {}),
          }
        : {
            tipoEvento: valores.tipoEvento,
            acaoAtividade: valores.acaoAtividade,
            disciplina: valores.disciplina,
            turno: valores.turno,
          }),
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
      disciplina: '',
      turno: '',
      titulo: '',
      resumo: '',
      dataInicio: null,
      dataFim: null,
      quantidade: null,
      hora: '',
      local: '',
      responsavel: '',
      telefone: '',
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
      disciplina: item.disciplina ?? '',
      turno: item.turno ?? '',
      titulo: item.titulo ?? '',
      resumo: item.resumo ?? '',
      dataInicio: item.dataInicio ? new Date(item.dataInicio) : null,
      dataFim: item.dataFim ? new Date(item.dataFim) : null,
      quantidade: item.quantidade ?? null,
      hora: item.hora ?? '',
      local: item.local ?? '',
      responsavel: item.responsavel ?? '',
      telefone: item.telefone ?? '',
    });
  }

  cancelarEdicaoItem(): void {
    this.editandoIndice.set(null);
    this.erroItem.set(null);
    this.itemForm.reset({
      tipo: 'ACAO_ATIVIDADE',
      tipoEvento: '',
      acaoAtividade: '',
      disciplina: '',
      turno: '',
      titulo: '',
      resumo: '',
      dataInicio: null,
      dataFim: null,
      quantidade: null,
      hora: '',
      local: '',
      responsavel: '',
      telefone: '',
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
        titulo: 'Cancelar este protocolo?',
        mensagem: 'As informações preenchidas até agora serão perdidas e não ficam salvas em nenhum lugar.',
        rotuloConfirmar: 'Sim, cancelar',
        corConfirmar: 'warn',
        icone: 'delete_outline',
      },
      width: '420px',
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.router.navigate(['/painel']);
      }
    });
  }

  salvar(): void {
    this.erroSalvar.set(null);

    if (this.documentoForm.invalid) {
      this.documentoForm.markAllAsTouched();
      this.erroSalvar.set('Preencha os campos obrigatórios de Dados do Documento.');
      return;
    }
    if (!this.anexoId()) {
      this.erroSalvar.set('É obrigatório anexar o ofício em PDF.');
      return;
    }
    if (this.itens().length === 0) {
      this.erroSalvar.set('Adicione ao menos um item de solicitação antes de protocolar.');
      return;
    }

    const parceiro = this.parceiro();
    if (!parceiro) {
      this.erroSalvar.set('Não foi possível identificar o Parceiro do usuário logado.');
      return;
    }

    const valoresDocumento = this.documentoForm.getRawValue();
    const mobilizadorId = this.resolverMobilizadorId(valoresDocumento.mobilizadorId);
    if (!mobilizadorId) {
      this.erroSalvar.set('Selecione em nome de qual Mobilizador esta solicitação está sendo protocolada.');
      return;
    }

    const ref = this.dialog.open(ConfirmarAcaoDialogComponent, {
      data: {
        titulo: 'Revise antes de protocolar',
        mensagem: 'Confira se as informações abaixo estão corretas antes de confirmar.',
        rotuloConfirmar: 'Protocolar Ofício',
        corConfirmar: 'primary',
        icone: 'fact_check',
        resumo: [
          { rotulo: 'Assunto', valor: valoresDocumento.assunto },
          { rotulo: 'Mobilizador', valor: this.resolverMobilizadorNome(valoresDocumento.mobilizadorId) || '—' },
          { rotulo: 'Município', valor: valoresDocumento.municipio || '—' },
          {
            rotulo: 'Data do Documento',
            valor: valoresDocumento.dataDocumento
              ? valoresDocumento.dataDocumento.toLocaleDateString('pt-BR')
              : '—',
          },
          { rotulo: 'Itens', valor: `${this.itens().length}` },
        ],
        avisoNotificacao: true,
      },
      width: '460px',
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.enviarSolicitacao(parceiro.id, mobilizadorId, valoresDocumento);
      }
    });
  }

  private enviarSolicitacao(
    parceiroId: string,
    mobilizadorId: string,
    valoresDocumento: ReturnType<typeof this.documentoForm.getRawValue>
  ): void {
    this.salvando.set(true);

    this.solicitacoesService
      .criar({
        parceiroId,
        mobilizadorId,
        assunto: valoresDocumento.assunto,
        numeroDocumento: valoresDocumento.numeroDocumento || undefined,
        dataDocumento: valoresDocumento.dataDocumento
          ? valoresDocumento.dataDocumento.toISOString()
          : new Date().toISOString(),
        municipio: valoresDocumento.municipio || undefined,
        resumoObservacoes: valoresDocumento.resumoObservacoes || undefined,
        urgencia: valoresDocumento.urgencia,
        anexoOficioId: this.anexoId() as string,
        itens: this.itens(),
      })
      .subscribe({
        next: (solicitacao) => {
          this.salvando.set(false);
          this.alerta.sucesso('Ofício protocolado com sucesso!');
          this.router.navigate(['/solicitacoes', solicitacao.id]);
        },
        error: () => {
          this.salvando.set(false);
          const mensagem = 'Não foi possível protocolar o ofício. Tente novamente.';
          this.erroSalvar.set(mensagem);
          this.alerta.erro(mensagem);
        },
      });
  }
}

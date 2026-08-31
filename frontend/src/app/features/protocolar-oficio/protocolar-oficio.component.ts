import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { AuthService } from '../../core/services/auth.service';
import { AnexosService } from '../../core/services/anexos.service';
import { ParceirosService } from '../../core/services/parceiros.service';
import { SolicitacoesService } from '../../core/services/solicitacoes.service';
import { ItemSolicitacao, Parceiro, TIPO_ITEM_LABELS, TipoItem } from '../../core/models';
import { PdfViewerComponent } from '../../shared/components/pdf-viewer/pdf-viewer.component';
import { CATALOGO_TIPOS_EVENTO } from '../../core/catalogos/catalogo-tipos-evento';

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
  private readonly router = inject(Router);

  readonly tiposItem: TipoItem[] = ['ACAO_ATIVIDADE', 'PATROCINIO', 'SOLICITACAO_ITENS', 'CONVITE'];
  readonly tipoItemLabels = TIPO_ITEM_LABELS;
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

  readonly itens = signal<ItemSolicitacao[]>([]);
  readonly erroItem = signal<string | null>(null);

  readonly salvando = signal(false);
  readonly erroSalvar = signal<string | null>(null);

  readonly documentoForm = this.fb.nonNullable.group({
    assunto: ['', Validators.required],
    numeroDocumento: [''],
    dataDocumento: [null as Date | null, Validators.required],
    municipio: [''],
    resumoObservacoes: [''],
  });

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
  });

  ngOnInit(): void {
    this.carregarParceiroDoMobilizador();

    // Trocar a categoria (Tipo do Evento) invalida a Ação/Atividade escolhida antes.
    this.itemForm.controls.tipoEvento.valueChanges.subscribe(() => {
      this.itemForm.controls.acaoAtividade.setValue('');
    });
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

  adicionarItem(): void {
    const valores = this.itemForm.getRawValue();
    this.erroItem.set(null);

    if (this.tipoAtualTemTitulo) {
      if (!valores.titulo) {
        this.erroItem.set('Informe o título do item.');
        return;
      }
    } else if (!valores.acaoAtividade) {
      this.erroItem.set('Informe a Ação/Atividade.');
      return;
    }

    const item: ItemSolicitacao = {
      tipo: valores.tipo,
      dataInicio: valores.dataInicio ? valores.dataInicio.toISOString() : undefined,
      dataFim: valores.dataFim ? valores.dataFim.toISOString() : undefined,
      ...(this.tipoAtualTemTitulo
        ? { titulo: valores.titulo, resumo: valores.resumo }
        : {
            tipoEvento: valores.tipoEvento,
            acaoAtividade: valores.acaoAtividade,
            disciplina: valores.disciplina,
            turno: valores.turno,
          }),
    };

    this.itens.update((lista) => [...lista, item]);
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
    });
  }

  removerItem(indice: number): void {
    this.itens.update((lista) => lista.filter((_, i) => i !== indice));
  }

  cancelar(): void {
    this.router.navigate(['/painel']);
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
      this.erroSalvar.set('Adicione ao menos um item de solicitação.');
      return;
    }

    const parceiro = this.parceiro();
    if (!parceiro?.mobilizadorId) {
      this.erroSalvar.set('Não foi possível identificar o parceiro do mobilizador logado.');
      return;
    }

    const valoresDocumento = this.documentoForm.getRawValue();
    this.salvando.set(true);

    this.solicitacoesService
      .criar({
        parceiroId: parceiro.id,
        mobilizadorId: parceiro.mobilizadorId,
        assunto: valoresDocumento.assunto,
        numeroDocumento: valoresDocumento.numeroDocumento || undefined,
        dataDocumento: valoresDocumento.dataDocumento
          ? valoresDocumento.dataDocumento.toISOString()
          : new Date().toISOString(),
        municipio: valoresDocumento.municipio || undefined,
        resumoObservacoes: valoresDocumento.resumoObservacoes || undefined,
        anexoOficioId: this.anexoId() as string,
        itens: this.itens(),
      })
      .subscribe({
        next: (solicitacao) => {
          this.salvando.set(false);
          this.router.navigate(['/solicitacoes', solicitacao.id]);
        },
        error: () => {
          this.salvando.set(false);
          this.erroSalvar.set('Não foi possível protocolar o ofício. Tente novamente.');
        },
      });
  }
}

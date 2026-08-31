import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { PreProtocolosService } from '../../core/services/pre-protocolos.service';
import { ParceirosService } from '../../core/services/parceiros.service';
import { ItemSolicitacao, Parceiro, PreProtocolo, TIPO_ITEM_LABELS, TipoItem } from '../../core/models';
import { PdfViewerComponent } from '../../shared/components/pdf-viewer/pdf-viewer.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { CATALOGO_TIPOS_EVENTO } from '../../core/catalogos/catalogo-tipos-evento';

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

  readonly tiposItem: TipoItem[] = ['ACAO_ATIVIDADE', 'PATROCINIO', 'SOLICITACAO_ITENS', 'CONVITE'];
  readonly tipoItemLabels = TIPO_ITEM_LABELS;
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
  readonly enviando = signal(false);
  readonly erroEnvio = signal<string | null>(null);

  readonly documentoForm = this.fb.nonNullable.group({
    parceiroId: ['', Validators.required],
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

  get parceiroSelecionado(): Parceiro | undefined {
    return this.parceiros().find((p) => p.id === this.documentoForm.controls.parceiroId.value);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;

    this.itemForm.controls.tipoEvento.valueChanges.subscribe(() => {
      this.itemForm.controls.acaoAtividade.setValue('');
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
        : { tipoEvento: valores.tipoEvento, acaoAtividade: valores.acaoAtividade, turno: valores.turno }),
    };

    this.itens.update((lista) => [...lista, item]);
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

  removerItem(indice: number): void {
    this.itens.update((lista) => lista.filter((_, i) => i !== indice));
  }

  cancelar(): void {
    this.router.navigate(['/pre-protocolo']);
  }

  converter(): void {
    this.erroEnvio.set(null);

    if (this.documentoForm.invalid) {
      this.documentoForm.markAllAsTouched();
      this.erroEnvio.set('Preencha os campos obrigatórios.');
      return;
    }
    const parceiro = this.parceiroSelecionado;
    if (!parceiro?.mobilizadorId) {
      this.erroEnvio.set('Selecione um Parceiro válido (com Mobilizador vinculado no RM).');
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
    this.enviando.set(true);

    this.preProtocolosService
      .converter(registro.id, {
        parceiroId: parceiro.id,
        mobilizadorId: parceiro.mobilizadorId,
        assunto: valores.assunto,
        numeroDocumento: valores.numeroDocumento || undefined,
        dataDocumento: valores.dataDocumento.toISOString(),
        municipio: valores.municipio || undefined,
        resumoObservacoes: valores.resumoObservacoes || undefined,
        anexoOficioId: registro.anexoOficioId,
        itens: this.itens(),
      })
      .subscribe({
        next: (solicitacao) => {
          this.enviando.set(false);
          this.router.navigate(['/solicitacoes', solicitacao.id]);
        },
        error: () => {
          this.enviando.set(false);
          this.erroEnvio.set('Não foi possível gerar o protocolo. Tente novamente.');
        },
      });
  }
}

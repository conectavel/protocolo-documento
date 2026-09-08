import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs';
import { PreProtocolosService } from '../../core/services/pre-protocolos.service';

/**
 * Formulário público de envio de solicitação — sem login, fora da área autenticada
 * (ver app.routes.ts). Qualquer pessoa pode preencher; vira um Pré-Protocolo com
 * origem = FORMULARIO_PUBLICO na mesma fila de triagem do Assessor usada para
 * e-mails (ver pre-protocolos.controller.ts `POST /pre-protocolos/publico`,
 * limitado por rate-limit no backend). Nunca cria uma Solicitação diretamente —
 * um humano sempre revisa antes.
 */
@Component({
  selector: 'app-enviar-solicitacao',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './enviar-solicitacao.component.html',
  styleUrl: './enviar-solicitacao.component.scss',
})
export class EnviarSolicitacaoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly preProtocolosService = inject(PreProtocolosService);
  private readonly destroyRef = inject(DestroyRef);

  readonly enviando = signal(false);
  readonly enviado = signal(false);
  readonly erro = signal<string | null>(null);
  readonly arquivo = signal<File | null>(null);
  readonly erroArquivo = signal<string | null>(null);
  readonly buscandoCpf = signal(false);
  readonly cpfReconhecido = signal(false);

  readonly form = this.fb.nonNullable.group({
    cpf: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    nome: ['', [Validators.required, Validators.maxLength(150)]],
    dataNascimento: ['', [Validators.required]],
    telefone: ['', [Validators.required, Validators.pattern(/^\d{10,11}$/)]],
    telefoneWhatsapp: [false],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(180)]],
    assunto: ['', [Validators.required, Validators.maxLength(200)]],
    mensagem: ['', [Validators.required, Validators.maxLength(4000)]],
  });

  constructor() {
    this.form.controls.cpf.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        distinctUntilChanged(),
        map((valor) => valor.replace(/\D/g, '')),
        debounceTime(400),
        filter((cpf) => cpf.length === 11),
        tap(() => this.buscandoCpf.set(true)),
        switchMap((cpf) => this.preProtocolosService.buscarPorCpf(cpf)),
      )
      .subscribe({
        next: (resultado) => {
          this.buscandoCpf.set(false);
          this.cpfReconhecido.set(resultado.encontrado);
          if (!resultado.encontrado) return;
          this.form.patchValue({
            nome: resultado.nome,
            email: resultado.email,
            telefone: resultado.telefone ?? '',
            telefoneWhatsapp: resultado.telefoneWhatsapp,
            dataNascimento: resultado.dataNascimento ?? '',
          });
        },
        error: () => this.buscandoCpf.set(false),
      });
  }

  /** Mantém só dígitos no campo — sem pontuação, para casar com o validador (11 dígitos). */
  aoDigitarCpf(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '').slice(0, 11);
    if (digitos !== input.value) {
      this.form.controls.cpf.setValue(digitos);
    }
  }

  /** Mantém só dígitos no campo de telefone, para casar com o validador (10-11 dígitos). */
  aoDigitarTelefone(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const digitos = input.value.replace(/\D/g, '').slice(0, 11);
    if (digitos !== input.value) {
      this.form.controls.telefone.setValue(digitos);
    }
  }

  selecionarArquivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0] ?? null;
    if (!arquivo) return;

    if (arquivo.type !== 'application/pdf') {
      this.erroArquivo.set('Selecione um arquivo em formato PDF.');
      input.value = '';
      return;
    }
    this.erroArquivo.set(null);
    this.arquivo.set(arquivo);
  }

  removerArquivo(): void {
    this.arquivo.set(null);
  }

  enviar(): void {
    this.erro.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.erro.set('Preencha os campos obrigatórios.');
      return;
    }

    const valores = this.form.getRawValue();
    const dados = new FormData();
    dados.append('cpf', valores.cpf);
    dados.append('nome', valores.nome);
    dados.append('dataNascimento', valores.dataNascimento);
    dados.append('telefone', valores.telefone);
    dados.append('telefoneWhatsapp', String(valores.telefoneWhatsapp));
    dados.append('email', valores.email);
    dados.append('assunto', valores.assunto);
    if (valores.mensagem) dados.append('mensagem', valores.mensagem);
    const arquivo = this.arquivo();
    if (arquivo) dados.append('anexo', arquivo);

    this.enviando.set(true);
    this.preProtocolosService.enviarPublico(dados).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviado.set(true);
      },
      error: (erro) => {
        this.enviando.set(false);
        if (erro?.status === 429) {
          this.erro.set('Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.');
        } else {
          this.erro.set('Não foi possível enviar sua solicitação. Tente novamente.');
        }
      },
    });
  }
}

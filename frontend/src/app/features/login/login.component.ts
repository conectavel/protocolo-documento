import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

/** Senha padrão de todos os usuários criados pelo seed de desenvolvimento (backend/src/database/seeds/seed.ts). */
const SENHA_SEED = 'senar@123';

interface UsuarioDebug {
  papel: string;
  email: string;
}

/** Um usuário representativo por papel, para login rápido em ambiente de desenvolvimento. */
const USUARIOS_DEBUG: UsuarioDebug[] = [
  { papel: 'Mobilizador', email: 'marcos.santos@senar-go.com.br' },
  { papel: 'Coordenador Regional', email: 'coordenador.regional@senar-go.com.br' },
  { papel: 'Assessor(a) do Superintendente', email: 'assessor@senar-go.com.br' },
  { papel: 'Superintendente', email: 'superintendente@senar-go.com.br' },
  { papel: 'Diretor(a) Educacional', email: 'diretor.educacional@senar-go.com.br' },
  { papel: 'Gestor(a) (FPR)', email: 'carol@senar-go.com.br' },
  { papel: 'Coordenador(a) (FPR)', email: 'claudimeire@senar-go.com.br' },
  { papel: 'Administrador(a)', email: 'admin@senar-go.com.br' },
];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly carregando = signal(false);
  readonly erro = signal<string | null>(
    this.route.snapshot.queryParamMap.get('sessaoExpirada')
      ? 'Sua sessão expirou. Faça login novamente.'
      : null,
  );
  readonly ocultarSenha = signal(true);

  /** Modo debug: login rápido por papel, disponível apenas fora de produção. */
  readonly modoDebug = !environment.production;
  readonly usuariosDebug = USUARIOS_DEBUG;
  readonly papelEmLogin = signal<string | null>(null);

  readonly formulario = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(1)]],
  });

  alternarVisibilidadeSenha(): void {
    this.ocultarSenha.update((valor) => !valor);
  }

  entrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { email, senha } = this.formulario.getRawValue();
    this.autenticar(email, senha);
  }

  /** Modo debug — login rápido com um usuário de exemplo do papel escolhido (ver seed.ts). */
  entrarComoDebug(usuario: UsuarioDebug): void {
    this.papelEmLogin.set(usuario.papel);
    this.formulario.setValue({ email: usuario.email, senha: SENHA_SEED });
    this.autenticar(usuario.email, SENHA_SEED);
  }

  private autenticar(email: string, senha: string): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.auth.login({ email, senha }).subscribe({
      next: () => {
        this.carregando.set(false);
        this.papelEmLogin.set(null);
        this.router.navigate(['/painel']);
      },
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.papelEmLogin.set(null);
        // eslint-disable-next-line no-console
        console.error('Falha no login:', erro);

        if (erro.status === 0) {
          this.erro.set(
            `Não foi possível conectar à API (${erro.url ?? 'URL não identificada'}). ` +
              'Verifique se o backend está rodando (npm run start:dev) e se o endereço em environment.ts está correto.',
          );
        } else if (erro.status === 401) {
          this.erro.set('E-mail ou senha inválidos. Verifique os dados e tente novamente.');
        } else {
          this.erro.set(
            `Erro inesperado ao entrar (HTTP ${erro.status}). Verifique o console do navegador ` +
              'e os logs do backend para mais detalhes.',
          );
        }
      },
    });
  }
}

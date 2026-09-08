import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, UsuarioDebug } from '../../core/services/auth.service';
import { PAPEL_LABELS, Papel } from '../../core/models';
import { environment } from '../../../environments/environment';

/** Senha padrão de todos os usuários criados pelo seed de desenvolvimento (backend/src/database/seeds/seed.ts). */
const SENHA_SEED = 'senar@123';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
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
export class LoginComponent implements OnInit {
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

  /** Modo debug: login rápido, disponível apenas fora de produção. */
  readonly modoDebug = !environment.production;
  readonly papelLabels = PAPEL_LABELS;
  readonly carregandoUsuariosDebug = signal(false);
  readonly usuariosDebug = signal<UsuarioDebug[]>([]);
  /** Papel escolhido no 1º passo do modo debug — null = ainda escolhendo o papel. */
  readonly papelSelecionado = signal<Papel | null>(null);
  readonly papelEmLogin = signal<string | null>(null);
  /** Filtro por nome/e-mail no 2º passo — útil quando o papel tem muitos usuários (ex.: Mobilizador, Presidente). */
  readonly filtroUsuarioDebug = signal('');

  /** Papéis com pelo menos um usuário ativo, na ordem em que aparecem na lista vinda do backend. */
  readonly papeisDisponiveis = computed(() => {
    const vistos = new Set<Papel>();
    const ordem: Papel[] = [];
    for (const usuario of this.usuariosDebug()) {
      if (!vistos.has(usuario.papel)) {
        vistos.add(usuario.papel);
        ordem.push(usuario.papel);
      }
    }
    return ordem;
  });

  readonly usuariosDoPapelSelecionado = computed(() => {
    const papel = this.papelSelecionado();
    if (!papel) return [];
    return this.usuariosDebug().filter((u) => u.papel === papel);
  });

  readonly usuariosDoPapelSelecionadoFiltrados = computed(() => {
    const termo = this.filtroUsuarioDebug().trim().toLowerCase();
    const usuarios = this.usuariosDoPapelSelecionado();
    if (!termo) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo) ||
        (u.sindicato?.toLowerCase().includes(termo) ?? false),
    );
  });

  readonly formulario = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(1)]],
  });

  ngOnInit(): void {
    if (!this.modoDebug) return;
    this.carregandoUsuariosDebug.set(true);
    this.auth.listarUsuariosDebug().subscribe({
      next: (usuarios) => {
        this.usuariosDebug.set(usuarios);
        this.carregandoUsuariosDebug.set(false);
      },
      error: () => this.carregandoUsuariosDebug.set(false),
    });
  }

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

  /**
   * Rótulo do botão no modo debug — "Sindicato - Nome". Um Coordenador Regional
   * cobre muitos sindicatos (1 Regional inteira); mostrar a lista toda ficaria
   * ilegível, então trunca visualmente aqui — a busca continua batendo contra
   * o texto completo de `usuario.sindicato` (ver usuariosDoPapelSelecionadoFiltrados).
   */
  rotuloDebug(usuario: UsuarioDebug): string {
    if (!usuario.sindicato) return usuario.nome;
    const limite = 60;
    const sindicato =
      usuario.sindicato.length > limite ? usuario.sindicato.slice(0, limite).trimEnd() + '…' : usuario.sindicato;
    return `${sindicato} - ${usuario.nome}`;
  }

  /** Modo debug, 1º passo — escolhe o papel para ver todos os usuários reais daquele perfil. */
  selecionarPapelDebug(papel: Papel): void {
    this.papelSelecionado.set(papel);
    this.filtroUsuarioDebug.set('');
  }

  voltarParaPapeisDebug(): void {
    this.papelSelecionado.set(null);
    this.filtroUsuarioDebug.set('');
  }

  /** Modo debug, 2º passo — login direto como o usuário escolhido (senha do seed). */
  entrarComoDebug(usuario: UsuarioDebug): void {
    this.papelEmLogin.set(usuario.email);
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

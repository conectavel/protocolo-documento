import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, Papel, Usuario } from '../models';

export interface UsuarioDebug {
  papel: Papel;
  nome: string;
  email: string;
  sindicato: string | null;
}

const TOKEN_KEY = 'po_access_token';
const USUARIO_KEY = 'po_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly usuarioSignal = signal<Usuario | null>(this.lerUsuarioArmazenado());

  readonly usuario = computed(() => this.usuarioSignal());
  readonly autenticado = computed(() => !!this.usuarioSignal());
  readonly papel = computed(() => this.usuarioSignal()?.papel ?? null);

  constructor(private readonly http: HttpClient) {}

  login(credenciais: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, credenciais).pipe(
      tap((resposta) => this.armazenarSessao(resposta.accessToken, resposta.usuario)),
      // A resposta do login não inclui parceiroId/coordenadorRegionalId (resolvidos a
      // partir do token pelo backend) — busca o perfil completo em seguida, já
      // autenticado, para que o restante do app tenha esses vínculos disponíveis.
      switchMap((resposta) =>
        this.buscarUsuarioAtual().pipe(map((usuarioCompleto) => ({ ...resposta, usuario: usuarioCompleto })))
      )
    );
  }

  /** Modo debug (tela de Login, fora de produção) — todos os usuários ativos, por papel. */
  listarUsuariosDebug(): Observable<UsuarioDebug[]> {
    return this.http.get<UsuarioDebug[]>(`${environment.apiUrl}/auth/debug/usuarios`);
  }

  buscarUsuarioAtual(): Observable<Usuario> {
    return this.http.get<Usuario>(`${environment.apiUrl}/auth/me`).pipe(
      tap((usuario) => {
        this.usuarioSignal.set(usuario);
        localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    this.usuarioSignal.set(null);
  }

  obterToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private armazenarSessao(token: string, usuario: Usuario): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
    this.usuarioSignal.set(usuario);
  }

  private lerUsuarioArmazenado(): Usuario | null {
    try {
      const bruto = localStorage.getItem(USUARIO_KEY);
      return bruto ? (JSON.parse(bruto) as Usuario) : null;
    } catch {
      return null;
    }
  }
}

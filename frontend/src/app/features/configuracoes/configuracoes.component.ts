import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../core/services/auth.service';
import { PreferenciasService } from '../../core/services/preferencias.service';
import { PreferenciasNotificacao, TipoNotificacao } from '../../core/models';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

type PermissaoPush = 'default' | 'granted' | 'denied' | 'nao-suportado';

/**
 * Configurações de notificação — um menu por usuário, com o catálogo de eventos
 * pertinente ao papel dele (ver backend notificacao-catalogo.ts). O canal "sistema"
 * é a caixa de notificações in-app (fundação já pronta para consumo futuro); o canal
 * "push" usa a Web Notifications API real do navegador — o usuário precisa conceder
 * permissão, e o disparo automático a partir de eventos do backend (fila/worker) é
 * a próxima etapa (ver tasks.md).
 */
@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatSlideToggleModule,
    LoadingStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuracoes.component.html',
  styleUrl: './configuracoes.component.scss',
})
export class ConfiguracoesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly preferenciasService = inject(PreferenciasService);
  private readonly snackBar = inject(MatSnackBar);

  readonly usuario = this.auth.usuario;

  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly canalSistema = signal(true);
  readonly canalPush = signal(false);
  readonly canalEmail = signal(false);
  readonly tiposAtivos = signal<Set<string>>(new Set());
  readonly tiposDisponiveis = signal<TipoNotificacao[]>([]);

  readonly permissaoPush = signal<PermissaoPush>(this.lerPermissaoAtual());

  ngOnInit(): void {
    this.preferenciasService.buscarMinhas().subscribe({
      next: (prefs) => this.aplicarPreferencias(prefs),
      error: () => {
        this.carregando.set(false);
        this.erro.set('Não foi possível carregar suas preferências de notificação.');
      },
    });
  }

  alternarTipo(codigo: string, marcado: boolean): void {
    this.tiposAtivos.update((atuais) => {
      const novo = new Set(atuais);
      marcado ? novo.add(codigo) : novo.delete(codigo);
      return novo;
    });
  }

  async alternarPush(ativar: boolean): Promise<void> {
    if (!ativar) {
      this.canalPush.set(false);
      return;
    }

    if (typeof Notification === 'undefined') {
      this.permissaoPush.set('nao-suportado');
      this.canalPush.set(false);
      this.snackBar.open('Seu navegador não suporta notificações push.', 'Ok', { duration: 4000 });
      return;
    }

    const resultado = await Notification.requestPermission();
    this.permissaoPush.set(resultado);

    if (resultado === 'granted') {
      this.canalPush.set(true);
      new Notification('Protocolo de Ofício', {
        body: 'Notificações ativadas com sucesso.',
      });
    } else {
      this.canalPush.set(false);
      this.snackBar.open(
        'Permissão de notificação negada pelo navegador. Ative nas configurações do site para usar este canal.',
        'Ok',
        { duration: 6000 },
      );
    }
  }

  salvar(): void {
    this.salvando.set(true);
    this.erro.set(null);

    this.preferenciasService
      .salvar({
        canalSistema: this.canalSistema(),
        canalPush: this.canalPush(),
        canalEmail: this.canalEmail(),
        tiposAtivos: [...this.tiposAtivos()],
      })
      .subscribe({
        next: (prefs) => {
          this.aplicarPreferencias(prefs);
          this.salvando.set(false);
          this.snackBar.open('Preferências salvas.', 'Ok', { duration: 3000 });
        },
        error: () => {
          this.salvando.set(false);
          this.erro.set('Não foi possível salvar suas preferências. Tente novamente.');
        },
      });
  }

  private aplicarPreferencias(prefs: PreferenciasNotificacao): void {
    this.canalSistema.set(prefs.canalSistema);
    this.canalPush.set(prefs.canalPush && this.permissaoPush() === 'granted');
    this.canalEmail.set(prefs.canalEmail);
    this.tiposAtivos.set(new Set(prefs.tiposAtivos));
    this.tiposDisponiveis.set(prefs.tiposDisponiveis);
    this.carregando.set(false);
  }

  private lerPermissaoAtual(): PermissaoPush {
    if (typeof Notification === 'undefined') return 'nao-suportado';
    return Notification.permission;
  }
}

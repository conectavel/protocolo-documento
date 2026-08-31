import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../core/services/auth.service';
import { PAPEL_LABELS, Papel } from '../core/models';

interface ItemNavegacao {
  rota: string;
  icone: string;
  rotulo: string;
  somenteMobilizador?: boolean;
  ocultoParaMobilizador?: boolean;
  somentePapeis?: Papel[];
}

/**
 * Casco do sistema — sidebar verde SENAR-GO com ícone + rótulo (224px, expande
 * como drawer sobre o conteúdo em telas <= 960px) + header 64px + conteúdo
 * (fundo #F1F5F9, padding responsivo) + footer 56px.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private static readonly CHAVE_TEMA = 'po_tema';

  // Claro é o padrão da aplicação; escuro é uma opção secundária que só
  // se aplica quando o usuário escolhe explicitamente (nunca pela
  // preferência do sistema operacional) — a escolha é lembrada entre sessões.
  private readonly temaEscuroSignal = signal(this.lerTemaArmazenado() === 'dark');
  readonly temaEscuro = computed(() => this.temaEscuroSignal());
  readonly anoAtual = new Date().getFullYear();

  // Drawer da sidebar em telas estreitas (<= 960px, ver shell.component.scss) —
  // a sidebar deixa de ficar sempre visível e passa a abrir por cima do conteúdo.
  readonly menuMobileAberto = signal(false);

  constructor() {
    this.aplicarTema(this.temaEscuroSignal());
  }

  readonly usuario = this.auth.usuario;
  readonly papelLabel = computed(() => {
    const usuario = this.usuario();
    return usuario ? PAPEL_LABELS[usuario.papel] : '';
  });

  readonly iniciais = computed(() => {
    const nome = this.usuario()?.nome?.trim();
    if (!nome) return '?';
    const partes = nome.split(/\s+/);
    const primeira = partes[0]?.[0] ?? '';
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  });

  readonly itensNavegacao: ItemNavegacao[] = [
    { rota: '/painel', icone: 'folder_open', rotulo: 'Painel de Ofícios' },
    {
      rota: '/protocolar',
      icone: 'note_add',
      rotulo: 'Protocolar Ofício',
      somenteMobilizador: true,
    },
    {
      rota: '/dashboard',
      icone: 'insights',
      rotulo: 'Dashboard',
      ocultoParaMobilizador: true,
    },
    {
      rota: '/substitutos',
      icone: 'swap_horiz',
      rotulo: 'Substitutos',
      ocultoParaMobilizador: true,
    },
    {
      rota: '/pre-protocolo',
      icone: 'mark_email_unread',
      rotulo: 'Pré Protocolo',
      somentePapeis: ['ASSESSOR', 'ADMIN'],
    },
    { rota: '/configuracoes', icone: 'settings', rotulo: 'Configurações' },
  ];

  readonly itensVisiveis = computed(() => {
    const papel = this.auth.papel();
    const ehMobilizador = papel === 'MOBILIZADOR';
    return this.itensNavegacao.filter((item) => {
      if (item.somenteMobilizador) return ehMobilizador;
      if (item.ocultoParaMobilizador && ehMobilizador) return false;
      if (item.somentePapeis) return !!papel && item.somentePapeis.includes(papel);
      return true;
    });
  });

  alternarMenuMobile(): void {
    this.menuMobileAberto.update((valor) => !valor);
  }

  fecharMenuMobile(): void {
    this.menuMobileAberto.set(false);
  }

  alternarTema(): void {
    this.temaEscuroSignal.update((valor) => !valor);
    this.aplicarTema(this.temaEscuroSignal());
  }

  private aplicarTema(escuro: boolean): void {
    document.documentElement.setAttribute('data-theme', escuro ? 'dark' : 'light');
    try {
      localStorage.setItem(ShellComponent.CHAVE_TEMA, escuro ? 'dark' : 'light');
    } catch {
      // localStorage indisponível (ex.: navegação privada) — segue sem persistir
    }
  }

  private lerTemaArmazenado(): string | null {
    try {
      return localStorage.getItem(ShellComponent.CHAVE_TEMA);
    } catch {
      return null;
    }
  }

  sair(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

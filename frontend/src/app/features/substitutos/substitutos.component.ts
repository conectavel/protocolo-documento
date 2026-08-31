import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SubstituicoesService } from '../../core/services/substituicoes.service';
import { AuthService } from '../../core/services/auth.service';
import { Substituicao, UsuarioResumo } from '../../core/models';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SubstitutoDialogComponent } from './dialogs/substituto-dialog.component';

/**
 * Substitutos — equivalente à funcionalidade "Substitutos" do Fluig: enquanto vigente,
 * o substituto assume o papel/escopo do substituído nas tramitações (ver backend
 * JwtStrategy + SolicitacoesService.identidadesEfetivas).
 */
@Component({
  selector: 'app-substitutos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    LoadingStateComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './substitutos.component.html',
  styleUrl: './substitutos.component.scss',
})
export class SubstitutosComponent implements OnInit {
  private readonly substituicoesService = inject(SubstituicoesService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly carregando = signal(true);
  readonly substituicoes = signal<Substituicao[]>([]);
  readonly usuarios = signal<UsuarioResumo[]>([]);
  readonly busca = signal('');

  readonly substituicoesFiltradas = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    if (!termo) return this.substituicoes();
    return this.substituicoes().filter(
      (s) =>
        s.usuarioSubstituidoNome?.toLowerCase().includes(termo) ||
        s.usuarioSubstitutoNome?.toLowerCase().includes(termo),
    );
  });

  ngOnInit(): void {
    this.carregar();
    this.substituicoesService.listarUsuarios().subscribe({
      next: (usuarios) => this.usuarios.set(usuarios),
      error: () => this.usuarios.set([]),
    });
  }

  carregar(): void {
    this.carregando.set(true);
    this.substituicoesService.listar().subscribe({
      next: (lista) => {
        this.substituicoes.set(lista);
        this.carregando.set(false);
      },
      error: () => {
        this.substituicoes.set([]);
        this.carregando.set(false);
      },
    });
  }

  abrirNovo(): void {
    const ref = this.dialog.open(SubstitutoDialogComponent, {
      data: { usuarios: this.usuarios() },
    });
    ref.afterClosed().subscribe((dto) => {
      if (!dto) return;
      this.substituicoesService.criar(dto).subscribe({
        next: () => {
          this.snackBar.open('Substituto adicionado.', 'Ok', { duration: 3000 });
          this.carregar();
        },
        error: (erro) => {
          this.snackBar.open(erro?.error?.message ?? 'Não foi possível salvar.', 'Ok', { duration: 5000 });
        },
      });
    });
  }

  editar(substituicao: Substituicao): void {
    const ref = this.dialog.open(SubstitutoDialogComponent, {
      data: { usuarios: this.usuarios(), substituicao },
    });
    ref.afterClosed().subscribe((dto) => {
      if (!dto) return;
      this.substituicoesService.atualizar(substituicao.id, dto).subscribe({
        next: () => {
          this.snackBar.open('Substituto atualizado.', 'Ok', { duration: 3000 });
          this.carregar();
        },
        error: (erro) => {
          this.snackBar.open(erro?.error?.message ?? 'Não foi possível salvar.', 'Ok', { duration: 5000 });
        },
      });
    });
  }

  remover(substituicao: Substituicao): void {
    if (!confirm(`Remover a substituição de ${substituicao.usuarioSubstituidoNome}?`)) return;
    this.substituicoesService.remover(substituicao.id).subscribe({
      next: () => {
        this.snackBar.open('Substituto removido.', 'Ok', { duration: 3000 });
        this.carregar();
      },
      error: () => this.snackBar.open('Não foi possível remover.', 'Ok', { duration: 4000 }),
    });
  }
}

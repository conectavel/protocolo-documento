import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { AlertaService } from '../../core/services/alerta.service';
import { UsuariosAdminService } from '../../core/services/usuarios-admin.service';
import { ContextoUsuarioAdmin, PAPEL_LABELS, Papel, UsuarioAdmin } from '../../core/models';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  ConfirmarAcaoDialogComponent,
} from '../../shared/components/confirmar-acao-dialog/confirmar-acao-dialog.component';
import {
  TransferirProcessosDialogComponent,
} from './dialogs/transferir-processos-dialog.component';
import { PromoverPapelDialogComponent } from './dialogs/promover-papel-dialog.component';

/** Papéis que realmente "possuem" trabalho em aberto reatribuível (ver UsuariosAdminService no backend). */
const PAPEIS_COM_PROCESSOS: Papel[] = ['COORDENADOR', 'GESTOR', 'DIRETOR_EDUCACIONAL'];

/** Papéis com um painel de detalhe específico (ver ContextoUsuarioAdmin). */
const PAPEIS_COM_DETALHE: Papel[] = ['COORDENADOR_REGIONAL', 'GESTOR', 'COORDENADOR', 'DIRETOR_EDUCACIONAL'];

/**
 * Papéis internos administráveis por aqui (adicionar/mover usuário entre perfis) —
 * Coordenador Regional, Mobilizador e Presidente são sincronizados do RM/ACORP e
 * só são geridos pela própria sincronização, nunca manualmente nesta tela.
 */
const PAPEIS_GERENCIAVEIS: Papel[] = [
  'ADMIN',
  'SUPERINTENDENTE',
  'ASSESSOR',
  'DIRETOR_EDUCACIONAL',
  'GESTOR',
  'COORDENADOR',
];

/**
 * Estrutura Aplicação › Grupo › Papel — agrupamento por fluxo de trabalho, para deixar
 * mais claro onde cada perfil atua dentro do processo (pedido do cliente).
 */
const GRUPOS: { titulo: string; papeis: Papel[] }[] = [
  { titulo: 'Direção', papeis: ['ADMIN', 'SUPERINTENDENTE'] },
  {
    titulo: 'Fluxo Educacional',
    papeis: ['ASSESSOR', 'DIRETOR_EDUCACIONAL', 'GESTOR', 'COORDENADOR'],
  },
  { titulo: 'Parceiros / Externos', papeis: ['COORDENADOR_REGIONAL', 'MOBILIZADOR', 'PRESIDENTE'] },
];

/**
 * Gerenciar Usuários (Administrador) — listar por perfil, ativar/desativar,
 * encaminhar para colocar um substituto temporário (módulo de Substituições
 * já existente) e, em desligamento, transferir o trabalho em aberto.
 */
@Component({
  selector: 'app-gerenciar-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    LoadingStateComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gerenciar-usuarios.component.html',
  styleUrl: './gerenciar-usuarios.component.scss',
})
export class GerenciarUsuariosComponent implements OnInit {
  private readonly usuariosAdminService = inject(UsuariosAdminService);
  private readonly dialog = inject(MatDialog);
  private readonly alerta = inject(AlertaService);
  private readonly router = inject(Router);

  readonly papelLabels = PAPEL_LABELS;
  readonly papeisComProcessos = PAPEIS_COM_PROCESSOS;
  readonly papeisComDetalhe = PAPEIS_COM_DETALHE;
  readonly papeisGerenciaveis = PAPEIS_GERENCIAVEIS;

  readonly carregando = signal(true);
  readonly usuarios = signal<UsuarioAdmin[]>([]);
  readonly busca = signal('');
  readonly filtroPapel = signal<Papel | ''>('');

  readonly usuariosFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const papel = this.filtroPapel();
    return this.usuarios().filter((usuario) => {
      const combinaBusca =
        !termo || usuario.nome.toLowerCase().includes(termo) || usuario.email.toLowerCase().includes(termo);
      const combinaPapel = !papel || usuario.papel === papel;
      return combinaBusca && combinaPapel;
    });
  });

  /** Aplicação › Grupo › Papel — cada grupo só aparece se tiver ao menos um papel com usuários. */
  readonly gruposPorGrupo = computed(() => {
    const porPapel = new Map<Papel, UsuarioAdmin[]>();
    for (const usuario of this.usuariosFiltrados()) {
      const lista = porPapel.get(usuario.papel) ?? [];
      lista.push(usuario);
      porPapel.set(usuario.papel, lista);
    }
    return GRUPOS.map((grupo) => ({
      titulo: grupo.titulo,
      papeis: grupo.papeis
        .filter((papel) => porPapel.has(papel))
        .map((papel) => ({ papel, usuarios: porPapel.get(papel)! })),
    })).filter((grupo) => grupo.papeis.length > 0);
  });

  /** Linha expandida (uma por vez) e seu contexto — carregado sob demanda, ao expandir. */
  readonly expandidoId = signal<string | null>(null);
  readonly carregandoContexto = signal(false);
  readonly contextos = signal<Map<string, ContextoUsuarioAdmin>>(new Map());

  /** Estado local de edição do multi-select de Áreas/Programa de um Coordenador (antes de salvar). */
  readonly areasSelecionadas = signal<Set<string>>(new Set());
  readonly salvandoAreas = signal(false);

  readonly departamentoEditando = signal('');
  readonly salvandoDepartamento = signal(false);

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.usuariosAdminService.listar().subscribe({
      next: (lista) => {
        this.usuarios.set(lista);
        this.carregando.set(false);
      },
      error: () => {
        this.alerta.erro('Não foi possível carregar a lista de usuários.');
        this.carregando.set(false);
      },
    });
  }

  alternarStatus(usuario: UsuarioAdmin): void {
    const novoStatus = !usuario.ativo;
    const ref = this.dialog.open(ConfirmarAcaoDialogComponent, {
      data: {
        titulo: novoStatus ? 'Ativar usuário?' : 'Desativar usuário?',
        mensagem: novoStatus
          ? `${usuario.nome} volta a conseguir fazer login e atuar normalmente no sistema.`
          : `${usuario.nome} não vai mais conseguir fazer login. Isso não move o trabalho em aberto dele — use "Transferir Processos" para isso.`,
        rotuloConfirmar: novoStatus ? 'Ativar' : 'Desativar',
        corConfirmar: novoStatus ? 'primary' : 'warn',
        icone: novoStatus ? 'check_circle' : 'block',
      },
      width: '440px',
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      this.usuariosAdminService.atualizarStatus(usuario.id, novoStatus).subscribe({
        next: (atualizado) => {
          this.usuarios.update((lista) => lista.map((u) => (u.id === atualizado.id ? atualizado : u)));
          this.alerta.sucesso(novoStatus ? 'Usuário ativado.' : 'Usuário desativado.');
        },
        error: () => this.alerta.erro('Não foi possível atualizar o status do usuário.'),
      });
    });
  }

  colocarSubstituto(): void {
    this.router.navigate(['/substitutos']);
  }

  adicionarUsuario(papelAlvo: Papel): void {
    const candidatos = this.usuarios().filter(
      (u) => u.papel !== papelAlvo && this.papeisGerenciaveis.includes(u.papel)
    );
    const ref = this.dialog.open(PromoverPapelDialogComponent, {
      data: { papelAlvo, candidatos },
      width: '480px',
    });

    ref.afterClosed().subscribe((usuarioId) => {
      if (!usuarioId) return;
      this.usuariosAdminService.alterarPapel(usuarioId, papelAlvo).subscribe({
        next: (atualizado) => {
          this.usuarios.update((lista) => lista.map((u) => (u.id === atualizado.id ? atualizado : u)));
          this.alerta.sucesso(`${atualizado.nome} agora é ${this.papelLabels[papelAlvo]}.`);
        },
        error: () => this.alerta.erro(`Não foi possível mover este usuário para ${this.papelLabels[papelAlvo]}.`),
      });
    });
  }

  contextoDe(usuarioId: string): ContextoUsuarioAdmin | undefined {
    return this.contextos().get(usuarioId);
  }

  /**
   * Helpers tipados por perfil — o compilador de templates do Angular não estreita
   * o union `ContextoUsuarioAdmin` a partir de `contexto?.tipo === 'X'` dentro de
   * `@if`, então cada perfil expõe seu próprio getter já com o tipo certo.
   */
  contextoCoordenadorRegional(usuarioId: string) {
    const contexto = this.contextoDe(usuarioId);
    return contexto?.tipo === 'COORDENADOR_REGIONAL' ? contexto : undefined;
  }

  contextoGestor(usuarioId: string) {
    const contexto = this.contextoDe(usuarioId);
    return contexto?.tipo === 'GESTOR' ? contexto : undefined;
  }

  contextoCoordenador(usuarioId: string) {
    const contexto = this.contextoDe(usuarioId);
    return contexto?.tipo === 'COORDENADOR' ? contexto : undefined;
  }

  contextoDiretor(usuarioId: string) {
    const contexto = this.contextoDe(usuarioId);
    return contexto?.tipo === 'DIRETOR_EDUCACIONAL' ? contexto : undefined;
  }

  toggleExpandir(usuario: UsuarioAdmin): void {
    if (this.expandidoId() === usuario.id) {
      this.expandidoId.set(null);
      return;
    }

    this.expandidoId.set(usuario.id);
    if (this.contextos().has(usuario.id)) {
      return;
    }

    this.carregandoContexto.set(true);
    this.usuariosAdminService.buscarContexto(usuario.id).subscribe({
      next: (contexto) => {
        this.contextos.update((mapa) => new Map(mapa).set(usuario.id, contexto));
        this.carregandoContexto.set(false);

        if (contexto.tipo === 'COORDENADOR') {
          this.areasSelecionadas.set(new Set(contexto.areasAtuaisIds));
        } else if (contexto.tipo === 'DIRETOR_EDUCACIONAL') {
          this.departamentoEditando.set(contexto.departamento ?? '');
        }
      },
      error: () => {
        this.carregandoContexto.set(false);
        this.alerta.erro('Não foi possível carregar os detalhes deste usuário.');
      },
    });
  }

  areaMarcada(areaId: string): boolean {
    return this.areasSelecionadas().has(areaId);
  }

  toggleArea(areaId: string): void {
    this.areasSelecionadas.update((atual) => {
      const novo = new Set(atual);
      novo.has(areaId) ? novo.delete(areaId) : novo.add(areaId);
      return novo;
    });
  }

  salvarAreas(usuario: UsuarioAdmin): void {
    const ids = [...this.areasSelecionadas()];
    if (ids.length === 0) {
      this.alerta.aviso('Selecione ao menos uma Área/Programa.');
      return;
    }

    this.salvandoAreas.set(true);
    this.usuariosAdminService.atualizarAreas(usuario.id, ids).subscribe({
      next: (atualizado) => {
        this.usuarios.update((lista) => lista.map((u) => (u.id === atualizado.id ? atualizado : u)));
        this.contextos.update((mapa) => {
          const novo = new Map(mapa);
          const contexto = novo.get(usuario.id);
          if (contexto?.tipo === 'COORDENADOR') {
            novo.set(usuario.id, { ...contexto, areasAtuaisIds: ids });
          }
          return novo;
        });
        this.salvandoAreas.set(false);
        this.alerta.sucesso('Áreas/Programa atualizadas.');
      },
      error: () => {
        this.salvandoAreas.set(false);
        this.alerta.erro('Não foi possível atualizar as Áreas/Programa.');
      },
    });
  }

  salvarDepartamento(usuario: UsuarioAdmin): void {
    const valor = this.departamentoEditando().trim();
    this.salvandoDepartamento.set(true);
    this.usuariosAdminService.atualizarDepartamento(usuario.id, valor).subscribe({
      next: () => {
        this.contextos.update((mapa) => new Map(mapa).set(usuario.id, { tipo: 'DIRETOR_EDUCACIONAL', departamento: valor }));
        this.salvandoDepartamento.set(false);
        this.alerta.sucesso('Pasta/Departamento atualizada.');
      },
      error: () => {
        this.salvandoDepartamento.set(false);
        this.alerta.erro('Não foi possível atualizar a Pasta/Departamento.');
      },
    });
  }

  transferirProcessos(usuario: UsuarioAdmin): void {
    const ref = this.dialog.open(TransferirProcessosDialogComponent, {
      data: { usuarioOrigem: usuario },
      width: '480px',
    });

    ref.afterClosed().subscribe((paraUsuarioId) => {
      if (!paraUsuarioId) return;
      this.usuariosAdminService.transferirProcessos(usuario.id, paraUsuarioId).subscribe({
        next: (resumo) => {
          this.alerta.sucesso(
            `Transferido: ${resumo.itensTransferidos} item(ns), ${resumo.solicitacoesTransferidas} solicitação(ões) e ${resumo.areasTransferidas} área(s).`
          );
        },
        error: () => this.alerta.erro('Não foi possível transferir os processos.'),
      });
    });
  }
}

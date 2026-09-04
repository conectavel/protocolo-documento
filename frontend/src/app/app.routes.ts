import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'painel' },
      {
        path: 'painel',
        loadComponent: () =>
          import('./features/painel-oficios/painel-oficios.component').then(
            (m) => m.PainelOficiosComponent
          ),
        title: 'Painel de Protocolo de Ofício',
      },
      {
        path: 'protocolar',
        canActivate: [roleGuard(['MOBILIZADOR', 'PRESIDENTE'])],
        loadComponent: () =>
          import('./features/protocolar-oficio/protocolar-oficio.component').then(
            (m) => m.ProtocolarOficioComponent
          ),
        title: 'Protocolar Ofício',
      },
      {
        path: 'solicitacoes/:id',
        loadComponent: () =>
          import('./features/detalhe-solicitacao/detalhe-solicitacao.component').then(
            (m) => m.DetalheSolicitacaoComponent
          ),
        title: 'Detalhe da Solicitação',
      },
      {
        path: 'dashboard',
        canActivate: [
          roleGuard([
            'COORDENADOR_REGIONAL',
            'ASSESSOR',
            'SUPERINTENDENTE',
            'DIRETOR_EDUCACIONAL',
            'GESTOR',
            'COORDENADOR',
            'ADMIN',
          ]),
        ],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Dashboard',
      },
      {
        path: 'configuracoes',
        loadComponent: () =>
          import('./features/configuracoes/configuracoes.component').then(
            (m) => m.ConfiguracoesComponent
          ),
        title: 'Configurações',
      },
      {
        path: 'pre-protocolo',
        canActivate: [roleGuard(['ASSESSOR', 'ADMIN'])],
        loadComponent: () =>
          import('./features/pre-protocolo/pre-protocolo-lista.component').then(
            (m) => m.PreProtocoloListaComponent
          ),
        title: 'Pré Protocolo',
      },
      {
        path: 'pre-protocolo/:id/converter',
        canActivate: [roleGuard(['ASSESSOR', 'ADMIN'])],
        loadComponent: () =>
          import('./features/pre-protocolo/converter-pre-protocolo.component').then(
            (m) => m.ConverterPreProtocoloComponent
          ),
        title: 'Converter Pré Protocolo',
      },
      {
        path: 'substitutos',
        canActivate: [
          roleGuard([
            'COORDENADOR_REGIONAL',
            'ASSESSOR',
            'SUPERINTENDENTE',
            'DIRETOR_EDUCACIONAL',
            'GESTOR',
            'COORDENADOR',
            'ADMIN',
          ]),
        ],
        loadComponent: () =>
          import('./features/substitutos/substitutos.component').then((m) => m.SubstitutosComponent),
        title: 'Substitutos',
      },
      {
        path: 'gerenciar-usuarios',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./features/gerenciar-usuarios/gerenciar-usuarios.component').then(
            (m) => m.GerenciarUsuariosComponent
          ),
        title: 'Gerenciar Usuários',
      },
    ],
  },
  { path: '**', redirectTo: 'painel' },
];

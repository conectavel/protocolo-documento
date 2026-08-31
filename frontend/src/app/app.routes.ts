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
        canActivate: [roleGuard(['MOBILIZADOR'])],
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
    ],
  },
  { path: '**', redirectTo: 'painel' },
];

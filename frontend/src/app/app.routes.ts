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
    // Fora do shell autenticado — qualquer pessoa acessa sem login, envia uma
    // solicitação que vira Pré-Protocolo (origem = FORMULARIO_PUBLICO) na
    // mesma fila de triagem usada para e-mails.
    path: 'enviar-solicitacao',
    loadComponent: () =>
      import('./features/enviar-solicitacao/enviar-solicitacao.component').then(
        (m) => m.EnviarSolicitacaoComponent
      ),
    title: 'Enviar Solicitação',
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
        title: 'Pré-Protocolo',
      },
      {
        path: 'pre-protocolo/:id/converter',
        canActivate: [roleGuard(['ASSESSOR', 'ADMIN'])],
        loadComponent: () =>
          import('./features/pre-protocolo/converter-pre-protocolo.component').then(
            (m) => m.ConverterPreProtocoloComponent
          ),
        title: 'Converter Pré-Protocolo',
      },
      {
        // Mesmo componente do "Converter Pré Protocolo", em modo "novo" (sem :id) —
        // dá autonomia ao Assessor para protocolar diretamente em nome de um
        // Parceiro quando o ofício chega em mãos, não por e-mail.
        path: 'protocolar-assessor',
        canActivate: [roleGuard(['ASSESSOR', 'ADMIN'])],
        loadComponent: () =>
          import('./features/pre-protocolo/converter-pre-protocolo.component').then(
            (m) => m.ConverterPreProtocoloComponent
          ),
        title: 'Novo Protocolo',
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

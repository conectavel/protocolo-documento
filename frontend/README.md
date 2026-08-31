# Frontend — Protocolo de Ofício

Angular 18 (standalone) + Angular Material, seguindo à risca
[`../documentacao/padrao-layout-fuse.md`](../documentacao/padrao-layout-fuse.md) (Fuse Compact + Material)
e o contrato em [`../documentacao/specs/protocolo-oficio/api-contract.md`](../documentacao/specs/protocolo-oficio/api-contract.md).

## Como executar

```bash
npm install
npm start          # http://localhost:4200 — espera a API em http://localhost:3000/api (ver backend/README.md)
npm run build      # build de produção em dist/
```

`src/environments/environment.ts` define `apiUrl` (`http://localhost:3000/api` em desenvolvimento).

## Estrutura

```
src/app/
  core/            modelos (espelham api-contract.md), services HTTP, guards de rota/papel, interceptor JWT
  shell/           casco Fuse Compact (sidebar 80px, header, footer)
  features/
    login/
    painel-oficios/       lista com abas de status, filtros, cards/tabela, paginator (Template 4)
    protocolar-oficio/    wizard de protocolo do ofício (Template 5)
    detalhe-solicitacao/  ações do fluxo por papel + devolutiva consolidada
  shared/          status-chip, empty-state, loading-state
```

## Login de teste

Use os usuários criados pelo seed do backend (senha `senha123`), por exemplo:
`marcos.santos@esenar.org.br` (Mobilizador) ou `coordenador.regional@esenar.org.br`.

## Simplificações assumidas nesta entrega (ver comentários no código)

- `etapaAtual` é tratado como texto livre vindo da API; os blocos de ação da tela de detalhe
  usam `statusMacro` como aproximação do estado — a validação definitiva de cada transição é
  sempre feita pelo backend.
- Não existe endpoint dedicado "meu parceiro"; o vínculo Mobilizador → Parceiro é resolvido
  filtrando a listagem de parceiros no cliente.
- O agrupamento em abas do painel (`INICIADOS/DESPACHO/ATENDIDOS/PARCIALMENTE/CANCELADOS`) é
  feito no cliente a partir do `statusMacro`, pois a API aceita apenas um filtro de status por
  requisição.

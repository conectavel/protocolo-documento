# Backlog de implementação — Protocolo de Ofício

Ordem de execução desta primeira entrega (marcado [x] o que este agente já implementou nesta sessão).

## Fase 0 — Especificação
- [x] `requirements.md` — HU01–HU09 formalizadas + hierarquia de negócio + NFRs
- [x] `data-model.md` — ER completo + regras de integridade
- [x] `design.md` — arquitetura, módulos, máquina de estados, mapeamento de telas
- [x] `integracao-rm-fluig.md` — contrato e estratégia de sincronização
- [x] `api-contract.md` — contrato REST compartilhado backend/frontend

## Fase 1 — Backend (NestJS)
- [x] Scaffold do projeto (`backend/`), config, TypeORM, módulos base
- [x] Entidades (`parceiro`, `presidente`, `mobilizador`, `coordenador-regional`, `area-programa`, `usuario`, `solicitacao`, `item-solicitacao`, `devolutiva`, `tramitacao`, `anexo`, `sincronizacao-rm`)
- [x] Módulo `auth` (JWT + guard de papel)
- [x] Módulo `parceiros` (somente leitura + endpoints de consulta)
- [x] Módulo `rm-integration` (client mock + webhook + job de sincronização)
- [x] Módulo `fluig-integration` (webhook + registro de referências)
- [x] Módulo `solicitacoes` (CRUD + máquina de estados HU01–HU09)
- [x] Módulo `devolutivas`
- [x] Módulo `anexos` (upload local)
- [x] Job de SLA de 24h (ciência automática)
- [x] Seed de dados de exemplo (FAEG / Eduardo Araújo / Marcos Santos / áreas e coordenadores do HU05)

## Fase 2 — Frontend (Angular + Fuse Compact)
- [x] Scaffold do projeto (`frontend/`), tema SCSS com os tokens de `padrao-layout-fuse.md`
- [x] Shell (sidebar 80px, header, footer)
- [x] Tela Painel de Protocolo de Ofício (lista/cards, abas de status, filtros)
- [x] Tela Protocolar Ofício (wizard de 3 seções, upload real do ofício)
- [x] Tela Detalhe da Solicitação (ações por papel + devolutiva consolidada)
- [x] Serviços HTTP (`auth`, `solicitacoes`, `parceiros`, `anexos`) e guards de rota/papel
- [x] `ng build` de produção verificado com sucesso (bundles lazy por feature)

## Fase 3 — Itens pendentes para a próxima iteração (não incluídos nesta entrega)
- [x] Testes unitários do `SolicitacaoStateMachineService` (HU02 ciência/SLA, HU03 decisões da Assessoria, HU08/HU09 consolidação de status macro) — `backend/src/modules/solicitacoes/solicitacao-state-machine.service.spec.ts`, 7/7 passando
- [ ] Testes e2e das telas principais do frontend
- [ ] Substituir client mock do RM Middleware pela integração real (endpoint/credenciais a obter com o time de infra do RM)
- [ ] Confirmar contrato real do Fluig para criação/consulta de agendamento (hoje apenas registra referências)
- [ ] SSO federado substituindo o JWT local
- [ ] Dockerfile/CI de deploy e ambiente de homologação
- [ ] Revisão de acessibilidade e responsivo mobile (breakpoints já previstos na spec visual, pendente de QA)

## Dependências externas a validar com o cliente/áreas de TI
1. Endpoint real e autenticação do **RM Middleware** (base URL, API key ou OAuth, formato exato do payload de webhook).
2. Endpoint real do **Fluig** para consulta/confirmação do processo de aceite do agendamento.
3. Lista definitiva de usuários internos (Assessor, Superintendente, Diretor Educacional e demais Gestores/Coordenadores) e forma de provisionamento (manual vs. sincronizado).

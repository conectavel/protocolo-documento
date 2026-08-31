# Design técnico — Sistema de Protocolo de Ofício

## 1. Visão geral da arquitetura

```
┌────────────────────┐        HTTPS/JSON        ┌──────────────────────────┐
│   Frontend Angular   │ ───────────────────────▶ │   Backend NestJS (API)    │
│   (Fuse Compact)     │ ◀─────────────────────── │                          │
└────────────────────┘                           │  - Auth (JWT)             │
                                                  │  - Solicitações (core)    │
                                                  │  - RM Integration module  │◀──sync──▶ RM/ACORP (fonte oficial)
                                                  │  - Fluig Integration mod. │◀──webhook/REST──▶ Fluig
                                                  │  - Anexos (storage)       │
                                                  └───────────┬──────────────┘
                                                              │ TypeORM
                                                              ▼
                                                     PostgreSQL (dados da app)
```

Stack escolhida (ambiente sem .NET SDK; Node 22/npm 10 disponíveis):

- **Backend**: NestJS 10 + TypeScript + TypeORM + PostgreSQL, autenticação JWT (Passport), upload via `@nestjs/platform-express` + storage local/S3-compatível (abstraído por `StorageService`), validação com `class-validator`/`class-transformer`, jobs agendados com `@nestjs/schedule` (SLA 24h e sincronização RM).
- **Frontend**: Angular 18 (standalone components) + Angular Material + SCSS de tokens próprios implementando fielmente `padrao-layout-fuse.md` (shell Fuse Compact, paleta, tipografia Inter, templates de lista/edição/dialog).
- **Integração RM**: módulo dedicado que fala com o **RM Middleware** (não diretamente com o RM/ACORP), conforme contrato definido pelo time de integração do RM. Nesta versão, implementado como client HTTP configurável + cache local (tabelas espelho) + job de sincronização periódica e endpoint de *push* (webhook) para atualização imediata.
- **Integração Fluig**: client HTTP para consulta/registro do aceite de agendamento e endpoint de *webhook* para receber a confirmação do Fluig e atualizar a devolutiva do item automaticamente.

## 2. Módulos do backend

| Módulo | Responsabilidade |
|---|---|
| `auth` | Login, JWT, guards de papel (RBAC), estratégia de integração futura com SSO do RM/Fluig |
| `usuarios` | Usuários internos (Assessor, Superintendente, Diretor, Gestor, Coordenador, Admin) e vínculo com Área/Programa |
| `parceiros` | Entidades somente-leitura sincronizadas do RM: Parceiro, Presidente, Mobilizador, Coordenador Regional |
| `rm-integration` | Client do RM Middleware, job de sincronização, endpoint de webhook `POST /integracoes/rm/eventos` |
| `fluig-integration` | Client do Fluig, endpoint de webhook `POST /integracoes/fluig/eventos`, registro de nº evento/turma e nº processo de aceite |
| `solicitacoes` | Núcleo do domínio: Solicitação, Item de Solicitação, Tramitação (histórico), máquina de estados, regras de HU01–HU09 |
| `devolutivas` | Registro de devolutiva por item e consolidação da devolutiva final |
| `anexos` | Upload/armazenamento/download do ofício e anexos de devolutiva |
| `scheduler` | Jobs: verificação de SLA de 24h (ciência automática), sincronização periódica RM |

## 3. Máquina de estados (implementação)

`SolicitacaoStateMachineService` centraliza as transições descritas em `requirements.md` §5, validando:

1. Papel do usuário autenticado é compatível com a transição solicitada.
2. Pré-condições da transição (ex.: `RECUSAR` exige `motivo` não vazio).
3. Emissão de um registro `TRAMITACAO` (append-only) a cada transição, no nível de solicitação **ou** de item.
4. Recalculo do `status_macro` derivado sempre que um `ITEM_SOLICITACAO.status_item` é alterado (HU08/HU09).

Jobs do `scheduler`:
- `VerificarCienciaRegionalJob` (a cada 15 min): busca solicitações com `data_ciencia_regional IS NULL` e `prazo_ciencia_regional < now()`, aplica transição `CIENCIA_AUTOMATICA` para `EM_ANALISE_ASSESSORIA`.
- `SincronizarRmJob` (configurável, default 10 min): chama o RM Middleware para obter deltas de Parceiro/Presidente/Mobilizador/Coordenador Regional e faz upsert local, registrando em `SINCRONIZACAO_RM`.

## 4. Frontend — telas (mapeadas ao `padrao-layout-fuse.md`)

Todas as telas usam o casco Fuse Compact (sidebar 80px, header 64px, conteúdo com padding 48px, footer). Ícone de título sempre emerald.

| Tela | Template da spec visual | Papéis que acessam |
|---|---|---|
| **Painel de Protocolo de Ofício** (lista) | Template 4 — Lista, com abas de status (`Iniciados / Despacho / Atendidos / Parcialmente / Cancelados`) acima dos filtros; Mobilizador não vê a aba "Despacho" nem o rótulo de etapa interna nos cards (HU01) | Todos |
| **Protocolar Ofício** (wizard) | Template 5 — Edição, em 3 seções: Identificação do Solicitante (Parceiro/Município/Presidente/Mobilizador — todos somente leitura, populados via `parceiros`), Dados do Documento (+ upload obrigatório do ofício), Tipo de Solicitação (formulário dinâmico por tipo + lista de itens adicionados) | Mobilizador (criação); todos os papéis internos (consulta) |
| **Detalhe da Solicitação / Ações do fluxo** | Template 5 — Edição + blocos de ação específicos do papel (ciência, aprovar/devolver/recusar, despachar, direcionar, designar coordenador, aceitar/encaminhar, registrar devolutiva) | Conforme papel e etapa atual |
| **Devolutiva** | Template 5 — Edição, seção adicional "Devolutiva" por item (chip de resultado + textarea de justificativa + campos de referência Fluig) | Coordenador da Ação/Programa (escrita); Mobilizador (leitura, consolidada) |
| **Dialog de recusa/devolução** | Template 8 — Dialog de formulário (motivo obrigatório) | Assessor |
| **Dialog "Selecionar Coordenador"** | Template 8 — Dialog de escolha | Gestor |

Regra de visibilidade (HU01) implementada no frontend por **guard de rota + filtragem de campos na resposta da API** — o backend nunca envia `etapa_atual` detalhada nem os dados de tramitação interna para o papel Mobilizador; a UI apenas reflete o que a API retorna (não há ocultação apenas cosmética).

## 5. Segurança e RBAC

Guards do NestJS por papel (`@Roles('MOBILIZADOR')`, `@Roles('COORDENADOR_REGIONAL')`, etc.), com policy adicional por *ownership* (Mobilizador só acessa solicitações do seu próprio Parceiro; Coordenador Regional só as dos Parceiros sob sua regional; Gestor/Coordenador apenas as de sua Área/Programa).

## 6. Observabilidade

- Log estruturado (pino) com correlação por `solicitacao_id`.
- Métricas de SLA (tempo médio de ciência, tempo médio por etapa) expostas em endpoint interno para dashboard futuro.
- Alertas de falha de sincronização RM (`SINCRONIZACAO_RM.status = ERRO`) expostos em endpoint de saúde `/health/rm-sync`.

## 7. Fora de escopo desta primeira entrega

- SSO real com RM/Fluig (login federado) — nesta versão o `auth` local emite JWT próprio; pontos de extensão documentados em `integracao-rm-fluig.md`.
- Editor visual de fluxo (BPM) — o fluxo é fixo, hard-coded na `SolicitacaoStateMachineService`, conforme os HUs.
- Multi-tenant além da estrutura Regional → Parceiro já existente.

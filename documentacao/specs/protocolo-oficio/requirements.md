# Requisitos — Sistema de Protocolo de Ofício (Solicitação de Cursos e Treinamentos)

> Fonte: `documentacao/Protocolo de documento.pdf` (histórias de usuário HU01–HU09, fluxograma "Protocolo de Ofício" e mocks do painel) + esclarecimentos do solicitante sobre hierarquia de usuários e integração RM/Fluig/ACORP.

## 1. Objetivo

Permitir que o **Mobilizador** registre, por meio de um **ofício** anexado, solicitações de cursos/treinamentos, patrocínio, itens ou convites em nome de um **Parceiro** (federação/entidade regional), e que essa demanda percorra um fluxo estruturado de ciência, análise, aprovação, direcionamento, execução e devolutiva — com rastreabilidade completa, prazos controlados e resposta formal consolidada ao solicitante.

O sistema deve manter os dados cadastrais de **Parceiro, Presidente, Mobilizador e Coordenador Regional** sempre sincronizados com o **RM/ACORP** (fonte oficial), via **RM Middleware**, e permitir o agendamento de eventos aprovados integrado ao **Fluig**.

## 2. Papéis (atores) do fluxo

| Papel | Origem do cadastro | Responsabilidade no fluxo |
|---|---|---|
| Mobilizador | RM/ACORP (via RM Middleware) | Protocola o ofício e acompanha status/devolutiva final |
| Coordenador Regional | RM/ACORP (via RM Middleware) | Dá ciência à solicitação (SLA 24h) |
| Assessor(a) do Superintendente | Cadastro interno do sistema | Análise inicial: aprova/devolve/recusa |
| Superintendente | Cadastro interno do sistema | Decide e despacha para a Diretoria competente |
| Diretor(a) Educacional | Cadastro interno do sistema | Direciona para o Gestor da área/programa |
| Gestor(a) de área/programa | Cadastro interno do sistema | Designa o Coordenador responsável |
| Coordenador(a) da Ação/Programa | Cadastro interno do sistema | Executa, agenda (Fluig) e registra a devolutiva |
| Presidente | RM/ACORP (via RM Middleware) | Referenciado nos dados da solicitação (não opera o sistema) |

## 3. Hierarquia e regras de vínculo (autoridade: RM/ACORP)

Regras confirmadas pelo solicitante — devem ser respeitadas em todo o modelo de dados e nas validações de cadastro/sincronização:

- **1 Coordenador Regional → N Parceiros**: um Coordenador Regional atende mais de um Parceiro.
- **1 Parceiro → 1 Coordenador Regional e 1 Mobilizador**: um Parceiro pertence a exatamente um Coordenador Regional e possui exatamente um Mobilizador vinculado.
- **1 Mobilizador → 1 Parceiro e 1 Regional**: um Mobilizador pertence a exatamente um Parceiro (e, por consequência, ao Coordenador Regional desse Parceiro).
- Cada Parceiro possui um **Presidente** institucional referenciado nas solicitações (1 Parceiro → 1 Presidente vigente).

Essas relações são geridas no RM/ACORP. O sistema **não permite edição manual** desses vínculos — apenas leitura, refletida automaticamente pela sincronização do RM Middleware (ver seção 8).

## 4. Histórias de usuário

### HU01 — Solicitar curso ou treinamento (Mobilizador)
- Cadastrar nova solicitação anexando o ofício correspondente (PDF obrigatório).
- Solicitação é encaminhada automaticamente ao fluxo de análise (Coordenador Regional).
- Mobilizador acompanha apenas **status macro** e **devolutiva final** — não visualiza etapas internas de análise/aprovação.
- Se a solicitação envolver múltiplas ações/programas, a devolutiva final deve ser **consolidada**, com a resposta individual de cada área.

### HU02 — Dar ciência à solicitação (Coordenador Regional)
- Recebe a solicitação das entidades sob sua regional para ciência (não analisa mérito).
- **SLA de 24 horas.** Sem registro de ciência no prazo, o sistema avança automaticamente para a Assessoria do Superintendente.
- Sistema registra data/hora da ciência manual ou do avanço automático, e por qual meio ocorreu.

### HU03 — Analisar a solicitação (Assessor do Superintendente)
- Analisa: data do ofício, prazo solicitado, tipo de solicitação, conteúdo do ofício, viabilidade inicial.
- Decisões possíveis:
  1. **Aprovar/Prosseguir** → encaminha ao Superintendente.
  2. **Devolver para ajuste** → retorna com motivo obrigatório registrado; reabre para complementação.
  3. **Recusar** → encerra a solicitação com justificativa obrigatória, que compõe a devolutiva ao Mobilizador.

### HU04 — Analisar e direcionar (Superintendente)
- Visualiza dados da solicitação e o parecer da Assessoria.
- Define a Diretoria responsável (para Cursos/Treinamentos → **Diretor Educacional**, fixo nesta primeira versão).
- Decisão e despacho registrados no histórico.

### HU05 — Designar área responsável (Diretor Educacional)
- Direciona a solicitação a um Gestor de área/programa. Áreas suportadas nesta versão:

| Código | Área/Programa | Gestor(a) | Coordenadores disponíveis |
|---|---|---|---|
| FPR | FPR | Carol | Claudimeire, Yanuze, Tatiana |
| PS | PS | Simone | Marcus, Isabela |
| EDU_FORM | Educação Formação / Curso Técnico | Rafael Rosa | Nara, Andreia, Bartolomeu |
| ATEG | ATeG | Guilherme Bizinotto | Eder, Bruna, Rena |

- Pode designar diretamente um coordenador, ou delegar ao Gestor para que este designe o coordenador.

### HU06 — Designar coordenador responsável (Gestor)
- Visualiza solicitações atribuídas à sua área/programa.
- Seleciona um coordenador vinculado à área; designação registrada no histórico.
- Acompanha o andamento subsequente.

### HU07 — Analisar e executar a demanda (Coordenador da Ação/Programa)
- Abre e analisa a demanda atribuída; verifica pertinência à sua área.
- Pode **aceitar** (segue com atendimento) ou **encaminhar para outra gerência** (sem encerrar ou duplicar a solicitação — mantém histórico do encaminhamento).
- Ao atender, registra: ação/programa responsável, curso/evento, data, horário, local (se aplicável), **agendamento no Fluig** (nº do evento/turma, nº do processo de aceite Fluig) e demais informações.
- Elabora e registra a devolutiva (atendido / parcialmente atendido / não atendido, com justificativa quando não atendido).

### HU08 — Distribuição para múltiplas ações/programas
- Uma solicitação pode conter itens de tipos e áreas diferentes (Ação/Atividade, Patrocínio, Solicitação de Itens, Convite), cada um roteável a uma área distinta.
- Cada área analisa e responde **individualmente** ao item que lhe compete; histórico mantém as respostas individualizadas.
- A devolutiva final ao Mobilizador é **sempre consolidada**, preservando o detalhamento por item/área.

### HU09 — Receber devolutiva final (Mobilizador)
- Recebe, ao final: resultado geral, ação/programa responsável por item, situação de atendimento, curso/evento, data, horário, local, informações do agendamento e justificativa (quando não atendido).
- Quando múltiplas áreas, a resposta é uma única devolutiva consolidada com o detalhe de cada item.

## 5. Máquina de estados da Solicitação (macro)

```
Rascunho → Em Análise (Regional) → Em Análise (Assessoria) → Em Análise (Superintendência/Despacho)
   → Em Execução (Diretoria/Gestor/Coordenador) → Atendido | Parcialmente Atendido | Não Atendido | Cancelado
```

Transições especiais:
- `Em Análise (Regional)` sem ciência em 24h → avança automaticamente para `Em Análise (Assessoria)` (registra `avanco_automatico = true`).
- `Em Análise (Assessoria)` → `Devolvido para Ajuste` → volta ao Mobilizador para complementar → reenvia para `Em Análise (Regional)` (reinicia ciclo).
- `Em Análise (Assessoria)` → `Cancelado` (recusa, com justificativa).
- Estado por **item da solicitação** é independente (cada item tem seu próprio status de atendimento); o status macro da solicitação é derivado: todos atendidos → `Atendido`; todos não atendidos → `Não Atendido`; misto → `Parcialmente Atendido`; qualquer item ainda pendente → estado de tramitação corrente.

## 6. Visibilidade por papel

- **Mobilizador**: vê apenas os agrupamentos "Iniciados / Atendidos / Parcialmente / Cancelados" (painel simplificado, sem a etapa interna corrente — ver mock página 2 do PDF).
- **Perfis internos** (Regional, Assessoria, Superintendência, Diretoria, Gestor, Coordenador): veem também a aba "Despacho" e o rótulo da etapa/área corrente em cada card (ver mock página 4 do PDF), além de filtros por Parceiro, Regional, Ação/Atividade, Disciplina, Tipo de Solicitação, Situação, Nº do Documento e período.

## 7. Tipos de item de solicitação

1. **Ação/Atividade** — Tipo do evento, Ação/Atividade, Disciplina, Data início/fim, Turno.
2. **Patrocínio** — Título, Resumo, Data início/fim.
3. **Solicitação de Itens** — Título, Resumo, Data início/fim.
4. **Convite** — Título, Resumo, Data início/fim.

Uma solicitação (ofício) pode conter **N itens**, de qualquer combinação dos 4 tipos, cada um endereçável a uma área diferente (regra HU08).

## 8. Integração RM/Fluig (requisito transversal)

- **RM/ACORP é a fonte oficial** dos dados de Parceiro, Presidente, Mobilizador e Coordenador Regional.
- O **RM Middleware** deve sincronizar essas entidades para o sistema de Protocolo de Ofício de forma automática, de modo que qualquer atualização feita no RM pelo ACORP **reflita imediatamente na etapa de solicitação** (o mesmo padrão já usado em outros processos do Fluig) — sem exigir cadastro/edição manual desses dados dentro deste sistema.
- O sistema deve tolerar indisponibilidade temporária do Middleware (cache local dos dados sincronizados) sem bloquear a operação, sinalizando dados "possivelmente desatualizados" quando a última sincronização exceder um limite configurável.
- O **Fluig** é o sistema onde o agendamento do evento/turma é efetivamente criado; o Protocolo de Ofício deve registrar as referências (nº do evento/turma, nº do processo de aceite Fluig) e, quando aplicável, disparar/consultar esse aceite via integração (webhook ou consulta programada), com devolução automática de status quando o agendamento for confirmado no Fluig.

Detalhes técnicos da integração estão em [`integracao-rm-fluig.md`](./integracao-rm-fluig.md).

## 9. Requisitos não funcionais

- Rastreabilidade completa: toda transição de estado, ciência, despacho, encaminhamento e devolutiva deve gerar registro imutável de histórico (quem, quando, o quê, de onde → para onde).
- Upload obrigatório de ofício em PDF (anexo) na abertura da solicitação; anexos adicionais permitidos nas devolutivas.
- Controle de SLA de 24h com job de verificação e avanço automático.
- Auditoria (criado em/por, alterado em/por) em todas as entidades editáveis, conforme padrão visual de auditoria do `padrao-layout-fuse.md`.
- Interface seguindo integralmente o `padrao-layout-fuse.md` (Fuse Compact + Material, pt-BR, tokens de cor/tipografia).
- Perfis de acesso (RBAC) por papel, com o Mobilizador estritamente limitado à visão consolidada (HU01).

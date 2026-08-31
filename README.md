# e-Senar — Protocolo de Ofício

Sistema para que o **Mobilizador** protocole ofícios (solicitação de cursos/treinamentos,
patrocínio, itens e convites) em nome de um **Parceiro**, com tramitação estruturada até a
devolutiva final — integrado ao **RM/ACORP** (fonte oficial de cadastro, via **RM Middleware**)
e ao **Fluig** (agendamento dos eventos aprovados).

## Onde começar

1. **Especificação funcional completa** (ler primeiro):
   [`documentacao/specs/protocolo-oficio/`](documentacao/specs/protocolo-oficio/)
   - `requirements.md` — histórias de usuário HU01–HU09, hierarquia de negócio, regras
   - `data-model.md` — modelo de dados (ER) e regras de integridade
   - `design.md` — arquitetura, módulos, máquina de estados, mapeamento de telas
   - `integracao-rm-fluig.md` — contrato e estratégia de sincronização com RM Middleware/Fluig
   - `api-contract.md` — contrato REST compartilhado entre backend e frontend
   - `tasks.md` — backlog desta entrega e pendências para a próxima iteração
2. **Fonte do processo**: `documentacao/Protocolo de documento.pdf` (fluxograma + histórias de usuário originais + mocks de tela).
3. **Padrão visual**: `documentacao/padrao-layout-fuse.md` (Fuse Compact + Material) — seguido à risca no frontend.

## Estrutura do repositório

```
documentacao/           specs, PDF de origem e padrão visual
backend/                API NestJS (TypeScript) — ver backend/README.md
frontend/               Aplicação Angular (Fuse Compact) — ver frontend/README.md
```

## Stack

- **Backend**: NestJS 10 + TypeORM + PostgreSQL, JWT, jobs agendados (SLA de 24h e sincronização RM).
- **Frontend**: Angular (standalone) + Angular Material, tema conforme `padrao-layout-fuse.md`.
- Escolha de stack: o ambiente de desenvolvimento tinha Node 22/npm 10 disponíveis e nenhum
  SDK .NET instalado — por isso backend e frontend usam TypeScript de ponta a ponta.

## Hierarquia de negócio (confirmada pelo cliente, fonte: RM/ACORP)

- 1 Coordenador Regional atende **N** Parceiros.
- 1 Parceiro pertence a exatamente **1** Coordenador Regional, **1** Mobilizador e **1** Presidente.
- 1 Mobilizador pertence a exatamente **1** Parceiro (e ao Regional desse Parceiro).

Essas entidades são sincronizadas do RM/ACORP via **RM Middleware** — nunca editadas manualmente
neste sistema — para que qualquer atualização feita pelo ACORP reflita automaticamente na etapa
de solicitação, exatamente como já ocorre nos demais processos do Fluig.

## Como rodar tudo localmente

```bash
# 1. Backend
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run seed
npm run start:dev        # http://localhost:3000/api

# 2. Frontend (em outro terminal)
cd frontend
npm install
npm start                 # http://localhost:4200
```

Consulte `backend/README.md` e `frontend/README.md` para detalhes e usuários de teste.

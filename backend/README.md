# Backend — Protocolo de Ofício

API em NestJS 10 + TypeORM + PostgreSQL. Especificação funcional completa em
[`../documentacao/specs/protocolo-oficio/`](../documentacao/specs/protocolo-oficio/).

## Como executar

```bash
cp .env.example .env
docker compose up -d          # sobe o PostgreSQL local
npm install
npm run seed                  # cria dados de exemplo (Parceiro FAEG, áreas, usuários)
npm run start:dev             # API em http://localhost:3000/api
```

Usuários criados pelo seed (senha padrão `senha123` para todos):

| Papel | E-mail |
|---|---|
| Mobilizador (FAEG) | marcos.santos@esenar.org.br |
| Coordenador Regional | coordenador.regional@esenar.org.br |
| Assessor | assessor@esenar.org.br |
| Superintendente | superintendente@esenar.org.br |
| Diretor Educacional | diretor.educacional@esenar.org.br |
| Gestor (ex.: FPR) | carol@esenar.org.br |
| Coordenador (ex.: FPR) | claudimeire@esenar.org.br |
| Admin | admin@esenar.org.br |

## Estrutura

- `src/modules/parceiros` — dados sincronizados do RM/ACORP (Parceiro, Presidente, Mobilizador, Coordenador Regional) — somente leitura.
- `src/modules/rm-integration` — client do RM Middleware (mock/HTTP), webhook e job de sincronização periódica.
- `src/modules/fluig-integration` — webhook de confirmação de agendamento do Fluig.
- `src/modules/solicitacoes` — núcleo do domínio: CRUD do ofício, itens, e `SolicitacaoStateMachineService` com toda a máquina de estados HU01–HU09.
- `src/modules/devolutivas`, `src/modules/anexos`, `src/modules/auth` — módulos de suporte.

## Comandos úteis

```bash
npm run start:dev   # desenvolvimento com watch
npm run build       # compila para dist/
npm run seed        # popula dados de exemplo
npm test            # testes unitários (a expandir — ver tasks.md Fase 3)
```

## Trocar o RM Middleware de mock para produção

Defina no `.env`:
```
RM_MIDDLEWARE_MODE=http
RM_MIDDLEWARE_BASE_URL=<url real>
RM_MIDDLEWARE_API_KEY=<chave real>
```
Nenhuma alteração de código é necessária — ver `rm-middleware.client.ts` e
`documentacao/specs/protocolo-oficio/integracao-rm-fluig.md`.

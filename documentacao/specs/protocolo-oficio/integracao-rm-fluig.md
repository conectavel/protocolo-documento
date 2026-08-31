# Integração RM Middleware / RM-ACORP / Fluig

## 1. Papel de cada sistema

| Sistema | Papel |
|---|---|
| **RM/ACORP** | Fonte oficial (source of truth) de Parceiro, Presidente, Mobilizador e Coordenador Regional. Toda edição cadastral acontece lá. |
| **RM Middleware** | Camada de integração/orquestração que expõe os dados do RM para os demais sistemas (incluindo este) e garante sincronização — o mesmo padrão já usado nos demais processos do Fluig, conforme confirmado pelo solicitante. |
| **Fluig** | Motor de workflow onde o agendamento do evento/turma é efetivamente criado e aceito; origem dos números "Evento/Turma" e "Processo de Aceite Fluig" vistos no painel. |
| **Sistema de Protocolo de Ofício** (este projeto) | Consumidor do RM Middleware para dados cadastrais; consumidor/produtor de eventos do Fluig para o agendamento de cursos aprovados. |

## 2. Por que via Middleware e não direto no RM/ACORP

O RM Middleware é o componente responsável por manter a sincronização entre RM/ACORP e os sistemas satélites (incluindo os demais processos já existentes no Fluig). Consumir diretamente o RM sem o Middleware duplicaria essa lógica de sincronização e criaria risco de divergência de dados entre este sistema e os demais processos do Fluig. Por isso, o Protocolo de Ofício **sempre** lê Parceiro/Presidente/Mobilizador/Coordenador Regional através do RM Middleware, nunca diretamente da base do RM.

## 3. Modelo de sincronização

Dois mecanismos complementares, para garantir que uma atualização no ACORP reflita "automaticamente" na etapa de solicitação (requisito explícito do solicitante):

1. **Webhook (tempo real)** — o RM Middleware notifica este sistema quando uma entidade muda:
   ```
   POST /integracoes/rm/eventos
   {
     "entidade": "PARCEIRO" | "PRESIDENTE" | "MOBILIZADOR" | "COORDENADOR_REGIONAL",
     "rmCodigo": "string",
     "operacao": "CRIADO" | "ATUALIZADO" | "INATIVADO",
     "payload": { ... campos da entidade ... },
     "timestamp": "ISO-8601"
   }
   ```
   O handler faz upsert imediato na tabela espelho local e grava em `SINCRONIZACAO_RM`. Autenticação via *shared secret*/HMAC no header (`X-RM-Signature`), a validar com a equipe de integração do RM.

2. **Sincronização periódica (fallback)** — job `SincronizarRmJob` consulta o RM Middleware (`GET /parceiros`, `GET /presidentes`, `GET /mobilizadores`, `GET /coordenadores-regionais`, todos com filtro de `atualizadoDesde`) a cada N minutos (default 10), cobrindo eventuais falhas de entrega do webhook. Idempotente por `rm_codigo`.

Qualquer solicitação já aberta referencia o Parceiro/Presidente/Mobilizador **por FK**, não por cópia dos dados — assim, quando o cadastro é atualizado, a tela de solicitação (em qualquer etapa) exibe automaticamente o dado mais recente, sem reprocessar a solicitação.

## 4. Contrato mínimo esperado do RM Middleware (a validar com o time responsável)

```
GET  /coordenadores-regionais?atualizadoDesde=...
GET  /parceiros?atualizadoDesde=...              -> inclui coordenadorRegionalRmCodigo, mobilizadorRmCodigo, presidenteRmCodigo
GET  /presidentes?atualizadoDesde=...
GET  /mobilizadores?atualizadoDesde=...          -> inclui parceiroRmCodigo
POST /integracoes/rm/eventos  (webhook recebido por este sistema)
```

Campos mínimos por entidade: `rmCodigo`, `nome`, `email`, campos de vínculo (conforme `data-model.md` §1), `ativo`, `atualizadoEm`.

> Observação de implementação: como o contrato real do RM Middleware depende da equipe de integração/infra do RM, o módulo `rm-integration` foi implementado com um **client abstraído por interface** (`RmMiddlewareClient`), com uma implementação HTTP configurável por variáveis de ambiente (`RM_MIDDLEWARE_BASE_URL`, `RM_MIDDLEWARE_API_KEY`) e uma implementação *mock* usada em desenvolvimento/testes (seed com os dados de exemplo do PDF: FAEG / Eduardo Araújo / Marcos Santos). Trocar de mock para produção é apenas configuração, sem alterar o domínio.

## 5. Integração com o Fluig (agendamento)

Quando o Coordenador da Ação/Programa registra o atendimento de um item (HU07), o sistema:

1. Salva localmente os dados do agendamento informados manualmente (data, horário, local) e, quando disponível, aciona o Fluig para efetivar o processo de aceite.
2. Persiste as referências retornadas: `numero_evento_turma` e `numero_processo_aceite_fluig` na `DEVOLUTIVA` do item (campos já observados no mock do painel, seção "Devolutiva").
3. Expõe `POST /integracoes/fluig/eventos` para o Fluig confirmar/atualizar esses números de forma assíncrona (ex.: quando o aceite é concluído dentro do próprio Fluig após o registro inicial) — replicando a regra do fluxograma "após agendamento, devolução automática".

```
POST /integracoes/fluig/eventos
{
  "itemSolicitacaoId": "uuid",
  "numeroEventoTurma": "2026080183",
  "numeroProcessoAceiteFluig": "9703264",
  "status": "CONFIRMADO" | "CANCELADO",
  "timestamp": "ISO-8601"
}
```

## 6. Pontos de extensão futura (fora do escopo desta entrega)

- SSO federado (login único) usando o mesmo provedor de identidade do RM/Fluig, substituindo o JWT local por validação de token externo.
- Consulta reversa (este sistema → Fluig) para criar diretamente o agendamento, em vez de apenas registrar os números — depende de endpoint de escrita do Fluig ainda não confirmado pela equipe responsável.

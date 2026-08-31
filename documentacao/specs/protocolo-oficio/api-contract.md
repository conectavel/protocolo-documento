# Contrato de API — Backend NestJS ↔ Frontend Angular

Base URL (dev): `http://localhost:3000/api`. Todas as respostas de listagem seguem `{ data: T[], total: number, page: number, pageSize: number }`. Datas em ISO-8601. Autenticação: header `Authorization: Bearer <jwt>`.

## Auth
```
POST /api/auth/login        { email, senha } -> { accessToken, usuario: { id, nome, papel, areaProgramaId? } }
GET  /api/auth/me           -> usuario autenticado
```

## Parceiros / RM (somente leitura)
```
GET /api/parceiros?search=&page=&pageSize=
GET /api/parceiros/:id
GET /api/mobilizadores?parceiroId=
GET /api/coordenadores-regionais
GET /api/areas-programa                 -> [{ id, codigo, nome, gestorId, coordenadores: [{id,nome}] }]
```

## Solicitações (núcleo)
```
GET  /api/solicitacoes?status=&parceiroId=&regionalId=&tipoSolicitacao=&acaoAtividade=&disciplina=&numeroDocumento=&dataInicio=&dataFim=&page=&pageSize=
     -> resposta filtrada por papel do usuário autenticado (RBAC + HU01: Mobilizador nunca recebe `etapaAtual` detalhada)

GET  /api/solicitacoes/:id              -> detalhe completo (itens, tramitações visíveis ao papel, devolutivas)

POST /api/solicitacoes                  -> cria solicitação (Mobilizador)
Body: {
  parceiroId, mobilizadorId, municipioId,
  assunto, numeroDocumento?, dataDocumento, resumoObservacoes?,
  anexoOficioId,                      // upload prévio via /api/anexos
  itens: [
    { tipo: 'ACAO_ATIVIDADE', tipoEvento, acaoAtividade, disciplina, dataInicio, dataFim, turno },
    { tipo: 'PATROCINIO', titulo, resumo, dataInicio, dataFim },
    { tipo: 'SOLICITACAO_ITENS', titulo, resumo, dataInicio, dataFim },
    { tipo: 'CONVITE', titulo, resumo, dataInicio, dataFim }
  ]
}

POST /api/solicitacoes/:id/ciencia                 -> Coordenador Regional dá ciência
POST /api/solicitacoes/:id/analise-assessoria       Body: { decisao: 'APROVAR'|'DEVOLVER_AJUSTE'|'RECUSAR', motivo? }
POST /api/solicitacoes/:id/despacho-superintendente Body: { diretoriaDestino: 'EDUCACIONAL' }
POST /api/solicitacoes/:id/direcionamento-diretor   Body: { areaProgramaId, coordenadorId? }   // coordenadorId opcional = delega ao gestor
POST /api/solicitacoes/itens/:itemId/designar-coordenador  Body: { coordenadorId }
POST /api/solicitacoes/itens/:itemId/aceitar
POST /api/solicitacoes/itens/:itemId/encaminhar     Body: { areaProgramaId, motivo }
POST /api/solicitacoes/itens/:itemId/devolutiva     Body: {
  resultado: 'ATENDIDO'|'PARCIALMENTE_ATENDIDO'|'NAO_ATENDIDO',
  justificativa?, dataEvento?, horario?, local?,
  numeroEventoTurma?, numeroProcessoAceiteFluig?
}

GET  /api/solicitacoes/:id/historico    -> tramitações (somente papéis internos)
```

## Anexos
```
POST /api/anexos                  multipart/form-data { arquivo, tipo: 'OFICIO'|'DEVOLUTIVA'|'OUTRO' } -> { id, nomeArquivo, url }
GET  /api/anexos/:id/download
```

## Integrações (usadas pelo RM Middleware / Fluig, não pelo frontend)
```
POST /api/integracoes/rm/eventos      (webhook do RM Middleware; header X-RM-Signature)
POST /api/integracoes/fluig/eventos   (webhook do Fluig)
```

## Enums compartilhados (gerar tipos idênticos em backend e frontend)

```ts
type StatusMacro = 'EM_ANALISE_REGIONAL' | 'EM_ANALISE_ASSESSORIA' | 'DEVOLVIDO_AJUSTE'
  | 'EM_DESPACHO' | 'EM_EXECUCAO' | 'ATENDIDO' | 'PARCIALMENTE_ATENDIDO' | 'NAO_ATENDIDO' | 'CANCELADO';

type TipoItem = 'ACAO_ATIVIDADE' | 'PATROCINIO' | 'SOLICITACAO_ITENS' | 'CONVITE';

type StatusItem = 'PENDENTE' | 'EM_ANALISE' | 'ATENDIDO' | 'PARCIALMENTE_ATENDIDO' | 'NAO_ATENDIDO' | 'ENCAMINHADO';

type Papel = 'MOBILIZADOR' | 'COORDENADOR_REGIONAL' | 'ASSESSOR' | 'SUPERINTENDENTE'
  | 'DIRETOR_EDUCACIONAL' | 'GESTOR' | 'COORDENADOR' | 'ADMIN';
```

## Regra de contrato crítica (HU01)

Para usuários com `papel = MOBILIZADOR`, o backend **remove** dos payloads de resposta: `etapaAtual`, o array `tramitacoes`, e qualquer campo de parecer interno (`motivo` de devolução/recusa antes da devolutiva final, nomes de assessores/gestores intermediários). O frontend não deve reimplementar essa ocultação — apenas renderizar o que a API retorna, para não haver divergência caso o contrato mude.

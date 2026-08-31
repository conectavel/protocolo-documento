# Modelo de Dados — Protocolo de Ofício

## 1. Diagrama de entidades

```mermaid
erDiagram
    COORDENADOR_REGIONAL ||--o{ PARCEIRO : atende
    PARCEIRO ||--|| MOBILIZADOR : possui
    PARCEIRO ||--|| PRESIDENTE : possui
    PARCEIRO ||--o{ SOLICITACAO : origina
    MOBILIZADOR ||--o{ SOLICITACAO : protocola
    SOLICITACAO ||--|| ANEXO : "ofício (obrigatório)"
    SOLICITACAO ||--o{ ITEM_SOLICITACAO : contem
    ITEM_SOLICITACAO ||--o| DEVOLUTIVA : recebe
    SOLICITACAO ||--o{ TRAMITACAO : historico
    ITEM_SOLICITACAO ||--o{ TRAMITACAO : historico
    AREA_PROGRAMA ||--o{ USUARIO_INTERNO : "gestor/coordenador"
    ITEM_SOLICITACAO }o--|| AREA_PROGRAMA : direcionado_a
    SOLICITACAO ||--o| SINCRONIZACAO_RM : rastreio_origem

    COORDENADOR_REGIONAL {
        uuid id PK
        string rm_codigo "código no RM/ACORP"
        string nome
        string email
        datetime ultima_sincronizacao_rm
    }
    PARCEIRO {
        uuid id PK
        string rm_codigo "código no RM/ACORP"
        string sigla
        string razao_social
        uuid coordenador_regional_id FK
        uuid mobilizador_id FK
        uuid presidente_id FK
        datetime ultima_sincronizacao_rm
    }
    PRESIDENTE {
        uuid id PK
        string rm_codigo
        string nome
        string email
        datetime ultima_sincronizacao_rm
    }
    MOBILIZADOR {
        uuid id PK
        string rm_codigo
        string nome
        string email
        uuid parceiro_id FK
        datetime ultima_sincronizacao_rm
    }
    USUARIO_INTERNO {
        uuid id PK
        string nome
        string email
        enum papel "ASSESSOR|SUPERINTENDENTE|DIRETOR_EDUCACIONAL|GESTOR|COORDENADOR|ADMIN"
        uuid area_programa_id FK "quando papel = GESTOR ou COORDENADOR"
    }
    AREA_PROGRAMA {
        uuid id PK
        string codigo "FPR|PS|EDU_FORM|ATEG"
        string nome
        uuid gestor_id FK
    }
    SOLICITACAO {
        uuid id PK
        string numero_documento "ex 0010/2025"
        string numero_processo "ex 980638"
        string id_documento
        uuid parceiro_id FK
        uuid mobilizador_id FK
        string assunto
        string observacao
        date data_documento
        enum status_macro "EM_ANALISE_REGIONAL|EM_ANALISE_ASSESSORIA|DEVOLVIDO_AJUSTE|EM_DESPACHO|EM_EXECUCAO|ATENDIDO|PARCIALMENTE_ATENDIDO|NAO_ATENDIDO|CANCELADO"
        string etapa_atual "rótulo da etapa/área corrente, visível só p/ perfis internos"
        datetime data_solicitacao
        datetime prazo_ciencia_regional "data_solicitacao + 24h"
        datetime data_ciencia_regional
        boolean ciencia_automatica
        datetime criado_em
        string criado_por
        datetime alterado_em
        string alterado_por
    }
    ITEM_SOLICITACAO {
        uuid id PK
        uuid solicitacao_id FK
        enum tipo "ACAO_ATIVIDADE|PATROCINIO|SOLICITACAO_ITENS|CONVITE"
        string titulo
        string resumo
        date data_inicio
        date data_fim
        string turno "MANHA|TARDE|NOITE, quando ACAO_ATIVIDADE"
        string tipo_evento
        string acao_atividade
        string disciplina
        uuid area_programa_id FK
        uuid coordenador_responsavel_id FK
        enum status_item "PENDENTE|EM_ANALISE|ATENDIDO|PARCIALMENTE_ATENDIDO|NAO_ATENDIDO|ENCAMINHADO"
    }
    DEVOLUTIVA {
        uuid id PK
        uuid item_solicitacao_id FK
        enum resultado "ATENDIDO|PARCIALMENTE_ATENDIDO|NAO_ATENDIDO"
        string justificativa
        string numero_evento_turma "referência Fluig"
        string numero_processo_aceite_fluig "referência Fluig"
        uuid registrado_por_id FK
        datetime registrado_em
    }
    TRAMITACAO {
        uuid id PK
        uuid solicitacao_id FK
        uuid item_solicitacao_id FK "nulo quando ação é no nível da solicitação"
        string de_etapa
        string para_etapa
        string acao "CIENCIA|CIENCIA_AUTOMATICA|APROVAR|DEVOLVER_AJUSTE|RECUSAR|DESPACHAR|DIRECIONAR|DESIGNAR_COORDENADOR|ACEITAR|ENCAMINHAR_OUTRA_AREA|REGISTRAR_DEVOLUTIVA"
        string motivo
        uuid usuario_id FK
        datetime criado_em
    }
    ANEXO {
        uuid id PK
        uuid solicitacao_id FK
        string tipo "OFICIO|DEVOLUTIVA|OUTRO"
        string nome_arquivo
        string url_storage
        integer tamanho_bytes
        datetime enviado_em
    }
    SINCRONIZACAO_RM {
        uuid id PK
        string entidade "PARCEIRO|PRESIDENTE|MOBILIZADOR|COORDENADOR_REGIONAL"
        uuid entidade_id
        string rm_codigo
        datetime sincronizado_em
        string status "OK|ERRO"
        string detalhe_erro
    }
```

## 2. Regras de integridade derivadas da hierarquia de negócio

- `PARCEIRO.coordenador_regional_id` obrigatório, não editável via UI (somente sincronização RM).
- `PARCEIRO.mobilizador_id` obrigatório e único (1:1) — um Mobilizador não pode estar associado a mais de um Parceiro simultaneamente; `MOBILIZADOR.parceiro_id` é a mesma relação vista do outro lado.
- `PARCEIRO.presidente_id` obrigatório (1:1 vigente; histórico de presidentes anteriores não é mantido nesta versão, apenas o vigente).
- Todas as tabelas de origem RM (`COORDENADOR_REGIONAL`, `PARCEIRO`, `PRESIDENTE`, `MOBILIZADOR`) são **somente leitura** para usuários finais; escrita ocorre exclusivamente pelo processo de sincronização (`SINCRONIZACAO_RM`).
- `SOLICITACAO.mobilizador_id` deve pertencer ao mesmo `parceiro_id` da solicitação (constraint de aplicação, validada no service, não apenas no banco).
- `ITEM_SOLICITACAO.area_programa_id` só é preenchido a partir da etapa "Diretor Educacional" (HU05); antes disso é nulo.
- `TRAMITACAO` é **append-only** — nenhuma linha é atualizada ou apagada (auditoria imutável).

## 3. Status macro × status de item

O `status_macro` da `SOLICITACAO` é **derivado**, nunca definido diretamente pelo usuário quando o resultado é `ATENDIDO | PARCIALMENTE_ATENDIDO | NAO_ATENDIDO`:

```
todosItens(status_item em [ATENDIDO])                → ATENDIDO
todosItens(status_item em [NAO_ATENDIDO])             → NAO_ATENDIDO
todosItens(status_item finalizado) e misto            → PARCIALMENTE_ATENDIDO
algumItem(status_item em [PENDENTE, EM_ANALISE, ENCAMINHADO]) → mantém status_macro de tramitação (etapa_atual reflete onde está)
```

## 4. Seed de referência (para ambiente de desenvolvimento)

Baseado nos exemplos do PDF, usado nas migrations de seed:

- Parceiro `FAEG` — Presidente `Eduardo Araújo` — Mobilizador `Marcos Santos`.
- Áreas/Programas e gestores: ver tabela em `requirements.md` §4 (HU05).
- Processo de exemplo: `Processo 980638`, `ID Documento 2359310`, `Documento 0010/2025`.

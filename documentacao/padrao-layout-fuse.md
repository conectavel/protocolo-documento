# Linguagem visual — Fuse Compact + Material

Documento autônomo para desenhar telas. Não depende de código, repositório nem domínio de negócio.

Quem desenha (Claude, Figma, HTML): use **somente** esta spec para aparência. O pedido do usuário define **o que** a tela faz. Esta spec define **como** ela parece.

---

## 0. Como usar este arquivo

Cole este markdown no chat e em seguida peça a tela, por exemplo:

> Desenhe a tela de lista de contratos seguindo a spec. Desktop, modo claro. Invente dados de exemplo.

Regras fixas:

1. Sempre desenhar **dentro do casco** (sidebar + header + conteúdo). Exceto se o pedido for só um dialog.
2. Reutilizar os templates desta spec. Não inventar outro layout, outra paleta ou outro grid.
3. Textos da interface em **português do Brasil**.
4. Ícones no estilo **Material Icons** (outlined/filled), 24px, com a cor semântica da seção 6.
5. Campos no estilo **Angular Material outlined** (borda, label flutuante).
6. Entregar mock visual (HTML/CSS, frame Figma-like ou wireframe rico). Não entregar código Angular.

---

## 1. Casco da aplicação (sempre presente)

Layout **Fuse Compact**. Desktop 1440×900 como padrão.

```
┌──────┬─────────────────────────────────────────────────────────┐
│      │  ☰                          ☀  🔔  👤                   │  header 64px
│ LOGO ├─────────────────────────────────────────────────────────┤
│  ⬜  │                                                         │
│  ⬜  │              CONTEÚDO DA TELA                           │
│  ⬜  │              (padding 48px)                             │
│  ⬜  │                                                         │
│  ⬜  │                                                         │
│      ├─────────────────────────────────────────────────────────┤
│      │  Sistema © 2026                                         │  footer 56px
└──────┴─────────────────────────────────────────────────────────┘
 sidebar
 80px
```

### Sidebar (esquerda)

- Largura **80px**, fundo **#1E293B** (slate-800), texto/ícones claros.
- Só ícones, centralizados, um abaixo do outro. Sem rótulo ao lado.
- Logo no topo (~40px), depois itens de navegação.
- Item ativo: fundo um pouco mais claro + ícone teal `#14B8A6`.
- Item inativo: ícone cinza claro `#94A3B8`.
- Em telas &lt; 960px a sidebar some (vira overlay). No mock desktop, manter visível.

### Header (topo do conteúdo)

- Altura **64px**, fundo branco `#FFFFFF`, sombra leve.
- Esquerda: botão hamburger (ícone `menu` / barras).
- Direita, nesta ordem: alternar tema, notificações, avatar do usuário.
- Tema claro: ícone `dark_mode` azul `#60A5FA`. Tema escuro: `light_mode` amarelo `#FACC15`.
- Avatar: círculo 40px com ícone `person`.

### Área de conteúdo

- Fundo da página **#F1F5F9** (slate-100).
- Padding interno **48px** (`p-12`).
- Conteúdo ocupa 100% da largura útil. Sem coluna central estreita.

### Footer

- Altura **56px**, borda superior `#E2E8F0`, texto secundário: `Sistema © {ano}`.

### Modo escuro (se pedido)

- Fundo da página `#0F172A`.
- Cards/header `#1E293B` ou `#1F2937`.
- Texto principal `#F1F5F9`, secundário `#CBD5E1`.
- Bordas `#374151` / `#334155`.
- Sidebar continua escura.

---

## 2. Tokens

### Cor

| Papel | Claro | Escuro | Uso |
|---|---|---|---|
| Primary | `#0D9488` (teal-600) | `#2DD4BF` | Botão principal, checkbox marcado, item ativo |
| Primary hover | `#0F766E` (teal-700) | `#14B8A6` | Hover do botão primary |
| Acento / ícone de título | `#059669` / `#10B981` (emerald) | `#34D399` | Ícone ao lado do H1, linha degradê, botão cards/tabela |
| Warn / perigo | `#DC2626` (red-600) | `#EF4444` | Cancelar (flat warn), excluir, erros |
| Ação secundária azul | `#2563EB` (blue-600) | `#3B82F6` | Botão Editar no menu de ações |
| Fundo página | `#F1F5F9` | `#0F172A` | Canvas |
| Superfície (card, header) | `#FFFFFF` | `#1F2937` | Cards, tabelas, header |
| Texto principal | `#1E293B` / `#111827` | `#F9FAFB` | Títulos e valores |
| Texto secundário | `#64748B` | `#9CA3AF` | Subtítulos, hints |
| Borda | `#E5E7EB` | `#374151` | Cards, tabela, accordion |
| Chip sucesso | bg `#D1FAE5` texto `#047857` | bg `#064E3B/40` texto `#6EE7B7` | Status ativo |
| Chip alerta | bg `#FEF3C7` texto `#92400E` | bg `#78350F/40` texto `#FDE68A` | Rascunho / pendente |
| Chip inativo | bg `#E2E8F0` texto `#334155` | bg `#1E293B` texto `#CBD5E1` | Encerrado / inativo |
| Banner aviso | bg `#FFFBEB` borda `#FDE68A` | bg `#451A03/40` borda `#92400E` | Faixa de pendência |

Texto sobre botão primary e warn: **sempre branco** `#FFFFFF`.

Não usar roxo, laranja forte ou outra marca como cor de produto. Cores de ícone por linha (azul, laranja, índigo, etc.) existem só no **corpo do card** — ver seção 6.

### Tipografia

Família: **Inter** (fallback system-ui / sans-serif).

| Elemento | Tamanho | Peso | Tracking |
|---|---|---|---|
| Título da página (H1) | 30px (`text-3xl`) | 600 | tight |
| Título de seção no card | 20px (`text-xl`) | 600 | tight |
| Título do card de lista | 16px (`text-base`) | 600 | normal |
| Corpo / campo | 14px | 400–500 | normal |
| Subtítulo da página | 14px | 500 | tight |
| Hint / meta | 12px | 400 | normal |
| Chip de status | 10px | 600 | wider, UPPERCASE |
| Label de auditoria | 11–12px | 600 | wide, UPPERCASE |

### Espaço e forma

- Padding da página: **48px**.
- Gap de grid de campos: **16px**.
- Gap entre seções: **20–24px**.
- Raio card de formulário: **16px** (`rounded-2xl`).
- Raio card de lista: **12px** (`rounded-xl`).
- Raio accordion, tabela, paginator: **8px** (`rounded-lg`).
- Raio chip e botão “trocar visualização”: **9999px** (pílula).
- Sombra card: `0 4px 6px rgba(0,0,0,.08)`; hover na lista: sombra maior.
- Linha divisória de seção: altura **2px**, `linear-gradient(to right, #059669, transparent)`, `border-radius: 9999px`.

### Breakpoints (só para o mock)

- Mobile: 1 coluna, só cards (sem tabela).
- Tablet ≥ 960px: 3 colunas de campos; tabela visível.
- Desktop ≥ 1280px: 4 cards por linha.

Padrão de entrega: **desktop claro**, salvo pedido contrário.

---

## 3. Anatomia de qualquer tela interna

Toda tela de módulo começa assim, no conteúdo:

```
[ícone emerald 24px]  Título da tela                          (30px, semibold)
[ícone info azul]     Frase de contexto                       (14px, cinza)
```

- Ícone do título: Material, cor **emerald** `#059669`.
- Ícone do subtítulo: sempre `info`, cor **azul** `#2563EB`.
- Sem breadcrumb. Sem abas no topo, a menos que o pedido peça abas.
- Depois do cabeçalho, entram os blocos do template (lista **ou** edição **ou** dialog).

---

## 4. Template — Tela de lista

Use quando o pedido for “listar”, “consultar”, “acompanhar”, “buscar”.

```
Cabeçalho (título + subtítulo)

[ opcional: banner âmbar de pendência ]

┌─ Accordion "Filtros Básicos" (aberto) ─────────────────────────┐
│  grid 3 colunas de campos outlined                               │
│                                                                  │
│  [🟢 Trocar para Tabela]              [Filtrar]  [Limpar Filtros]│
└──────────────────────────────────────────────────────────────────┘

[ 🔍  campo busca full-width, pílula ]     [ + Novo … ]

grid de cards 4 colunas   OU   tabela
(último card do grid = card de paginação, se couber)

[ paginator: 5 / 10 / 20, first/last ]
```

### Accordion de filtros

- Painel Material, `rounded-lg`, sombra, fundo branco.
- Header: ícone `filter_alt` + texto **“Filtros Básicos”** (14px, semibold).
- Aberto por padrão.
- Campos em **grid 3 colunas**.
- Rodapé do painel:
  - Esquerda: botão pílula **verde** (`#10B981` ou `#059669`), ícone `view_module` / `table_chart`, texto “Trocar para Tabela” ou “Trocar para Cards”.
  - Direita: **Filtrar** (flat primary + ícone `filter_alt`) e **Limpar Filtros** (stroked + ícone `clear`).

### Busca + novo

- Campo de busca: full width, aparência pílula (`rounded-full`), ícone `search` à esquerda, placeholder “Buscar por …”.
- À direita: botão flat primary **“Novo {entidade}”** com ícone `add`.

### Visualização

- Desktop: cards **ou** tabela, conforme o toggle (padrão: cards).
- Mobile: só cards.

### Vazio / loading

Card branco, centralizado, ícone + texto 14px:

- Carregando: ícone `hourglass_empty` teal, texto “Carregando …”.
- Sem dados: ícone `info_outline` cinza, texto **“Nenhum dado disponível”**.

### Paginator

Barra branca, `rounded-lg`, borda, sombra, abaixo da lista. Opções 5 / 10 / 20. Botões primeira/última página.

### Banner de pendência (só se o pedido tiver alerta)

Faixa `rounded-xl`, fundo `#FFFBEB`, borda `#FDE68A`, ícone `schedule` âmbar. Texto à esquerda, botão stroked à direita.

---

## 5. Template — Tela de edição / cadastro

Use quando o pedido for “criar”, “editar”, “formulário”, “cadastro”.

```
Cabeçalho (título + subtítulo)

┌─ Card seção 1 ─────────────────────────────────────────────────┐
│  Título da seção (20px)                                          │
│  ═══════ degradê emerald → transparente ═══════                  │
│  grid 3 colunas de campos (às vezes 4, se muitos campos curtos)  │
│  campo largo (assunto, observação) ocupa a linha inteira         │
│  textarea 4 linhas para texto longo                              │
└─────────────────────────────────────────────────────────────────┘

┌─ Card seção 2 (se houver) ─────────────────────────────────────┐
│  Título + botão primary à direita (“+ Adicionar …”)              │
│  ═══════ degradê ═══════                                         │
│  blocos internos bordered rounded-xl, um por item repetível      │
└─────────────────────────────────────────────────────────────────┘

┌─ Card “Informações do sistema” (só em edição, se fizer sentido) ┐
│  [ícone info em quadrado cinza]  título + subtítulo auditoria    │
│  ──── linha cinza ────                                           │
│  2 colunas: Criado em / Criado por / Alterado em / Alterado por  │
│  cada valor num box cinza-claro com ícone                        │
└─────────────────────────────────────────────────────────────────┘

[ Cancelar  vermelho flat ]   [ Salvar  teal flat ]
```

### Card de formulário

- Fundo branco, padding **24px**, `rounded-2xl`, sombra.
- Primeira linha da seção: título 20px semibold.
- Logo abaixo: linha degradê emerald (nunca uma borda comum no título).
- Campos: Material outlined, label flutuante, 1 linha. Hint abaixo se necessário.
- Grid padrão: **3 colunas**. Formulário denso (muitos campos curtos): **4 colunas**.
- Campo que é descrição/assunto: 1 coluna (largura total).
- Autocomplete: campo normal; dropdown com “Sem resultados” em amarelo/preto se vazio.

### Bloco aninhado (item repetível)

- `rounded-xl`, borda `#E5E7EB`, padding 16px, margem entre itens 16px.
- Botão “Remover” stroked warn no canto inferior direito, só se houver mais de um.

### Bloco inline “novo cadastro auxiliar”

Quando o form abre um mini-cadastro (ex.: novo grupo): caixa `rounded-xl`, borda emerald, fundo `#ECFDF5/50`, campos em 2 colunas, Cancelar stroked + Salvar primary.

### Upload / prévia

- Botão stroked “Selecionar arquivo” + ícone `cloud_upload` + nome do arquivo.
- Área de prévia: borda **tracejada**, `rounded-xl`, padding 16px, altura ~420px se for documento.

### Auditoria (somente edição de registro existente)

- Ícone `info` branco dentro de quadrado 48×48, fundo cinza `#9CA3AF`, `rounded-xl`.
- Título “Informações do sistema”, subtítulo “Dados de auditoria e histórico”.
- Divisor cinza (não emerald).
- 4 campos em 2 colunas. Cada valor: box fundo `#F8FAFC`, borda, ícone cinza + texto.
- Labels uppercase, 12px, cinza.

### Rodapé da tela

Grid **2 colunas iguais**:

| Esquerda | Direita |
|---|---|
| **Cancelar** — `mat-flat-button` warn, vermelho, texto branco | **Salvar** — `mat-flat-button` primary, teal, texto branco |

Em loading no Salvar: spinner branco 24px no lugar do texto. Cancelar desabilitado.

Não colocar esses botões dentro do último card. Ficam **abaixo**, na largura do conteúdo.

---

## 6. Template — Card de lista

Grid: 1 col mobile → 2 sm → 3 md → **4 xl**. Gap 24px.

Cada card:

```
┌──────────────────────────────────────┐
│ [ícone]  Título truncado      [⋮]    │
│                                      │
│ [ícone azul]    Rótulo: valor        │
│ [ícone laranja] Rótulo: valor        │
│ [ícone índigo]  Rótulo: valor        │
│ [ícone]         Status: [CHIP]       │
│ … mais linhas …                      │
│ ──────────────────────────────────── │
│                    ⬇  ✓  👁         │
└──────────────────────────────────────┘
```

### Regras do card

- Fundo branco, borda `#E5E7EB`, `rounded-xl`, padding 20px, sombra média. Hover: sombra maior.
- Topo: ícone emerald + título 16px semibold (truncar). Direita: botão circular cinza `more_vert`.
- Cada linha de dado: ícone 24px + `<strong>Rótulo:</strong> valor`, 14px. Gap 8px. `mt-1` entre linhas.
- Paleta dos ícones de linha (rodar nesta ordem, um por linha):

  | Ordem | Cor | Exemplo de ícone |
  |---|---|---|
  | 1 | azul `#2563EB` | `badge`, `subject` |
  | 2 | laranja `#F97316` | `person` |
  | 3 | índigo `#4F46E5` | `apartment` |
  | 4 | roxo `#9333EA` | `flag` |
  | 5 | emerald (status) | `toggle_on` |
  | 6 | teal `#0D9488` | `account_tree` |
  | 7 | sky `#0284C7` | `badge` |
  | 8 | lima `#65A30D` | `update` |

- Status sempre em **chip pílula** (ver tokens).
- Rodapé do card: borda superior `#F3F4F6`, padding-top 8px, ações à **direita** em `icon-button`: download, ver, etc.
- Registro inativo/encerrado: fundo slate suave, ícone e título dessaturados — sem vermelho.

### Menu ⋮ (Ações)

Painel pequeno, título “Ações”. Dois botões **pílula full-width**, um abaixo do outro:

1. **Editar** — fundo `#2563EB`, ícone `edit`, texto branco.
2. **Excluir** — fundo `#DC2626`, ícone `delete`, texto branco, margem-top 8px.

### Card de paginação (no grid)

Ocupa o espaço de um card no fim da grade. Não é um registro.

- Cabeçalho: ícone `inventory_2` em quadrado emerald claro + “PAGINAÇÃO”.
- Três linhas: Exibidos (página) / Total / Restantes, com números em destaque (emerald, azul, teal).
- Centro: `{já vistos} / {total}` em número grande + barra de progresso emerald.
- Rodapé: faixa emerald clara com `arrow_downward` + dica (“role a página para ver mais”).

---

## 7. Template — Tabela

Use na visualização “tabela” da lista.

- Container `rounded-lg`, borda, fundo branco, overflow-x auto.
- Header: 14px semibold, cinza `#374151`, padding 12px 16px, fundo branco. Colunas sortáveis com seta.
- Célula: 14px, cinza `#4B5563`, padding 8px 16px.
- Hover da linha: `#F9FAFB`.
- Status na célula: o mesmo chip da lista.
- Coluna **Ações** centralizada: icon-buttons (download, ver, `more_vert`).
- Sem dados: faixa “Nenhum dado encontrado.” centralizada, 16px, cinza.
- Não usar tabela zebra colorida. Não usar borda em cada célula.

---

## 8. Template — Dialog / modal

Use quando o pedido for escolha, confirmação ou formulário curto sobre a lista.

### Dialog de escolha (2 opções)

Padding 24px. Título 20px. Subtítulo 14px cinza. Depois **grid 2 colunas** de cards-botão:

- Card: `rounded-xl`, borda cinza, padding 16px, alinhado à esquerda.
- Ícone emerald + título semibold + descrição 12px cinza.
- Hover: borda e fundo emerald suave (`#ECFDF5`).
- Rodapé: **Cancelar** à direita (`mat-button` texto).

### Dialog de formulário

```
Título emerald 24px + ícone     [x fechar]
subtítulo

Título de seção + degradê
grid 2 colunas de campos

[ Cancelar stroked ]  [ Salvar primary ]
```

- Fundo branco (escuro: `#1F2937`).
- Header e ações **fixos**; conteúdo no meio com scroll se passar da altura.
- Título do dialog em emerald `#065F46` / `#6EE7B7`.
- Ações: grid 2 colunas, igual ao rodapé de edição, padding 24px.
- Checkbox de permissão/flag: cada um numa caixinha `rounded-xl` com borda, em grid 2 colunas.

Largura típica: 560–720px. Não desenhar dialog fullscreen.

---

## 9. Componentes avulsos

### Botões

| Tipo | Visual | Quando |
|---|---|---|
| Primary flat | fundo teal `#0D9488`, texto branco, ícone à esquerda | Filtrar, Salvar, Novo |
| Warn flat | fundo vermelho `#DC2626`, texto branco | Cancelar (rodapé de form) |
| Stroked | borda cinza, fundo transparente | Limpar filtros, Cancelar (dialog), upload |
| Text / mat-button | só texto teal ou cinza | links “+ Novo grupo”, Cancelar leve |
| Pílula verde | fundo `#10B981`, texto branco, `rounded-full` | Trocar cards/tabela |
| Icon-button | círculo, só ícone | ações da tabela/card, fechar dialog |
| Pílula azul/vermelha no menu | full-width, `rounded-full`, sombra | Editar / Excluir no ⋮ |

Nunca usar botão ghost genérico no lugar do primary. Nunca outline teal no Salvar — Salvar é **preenchido**.

### Campos

- Appearance **outline**.
- Label flutuante.
- Select, date (`dd/MM/yyyy`), autocomplete e textarea seguem o mesmo campo.
- Checkbox custom: quadrado 17px, marcado = fundo teal `#0D9488` + check branco.

### Chip de status

Pílula, `px-2 py-0.5`, 10px, uppercase, tracking amplo.

- Sucesso / ativo → emerald
- Atenção / rascunho / pendente → âmbar
- Neutro / encerrado / inativo → slate

Não inventar chip vermelho para status, salvo erro explícito.

---

## 10. Ícones

Pacote: **Material Icons**. Traço simples, 24px no fluxo, 20–22px em chips/hints.

Título da página: um ícone que represente a entidade (`folder_open`, `person`, `verified`, `description`, `inventory_2`, …) **sempre emerald**.

Ações recorrentes:

| Ação | Ícone |
|---|---|
| Filtrar | `filter_alt` |
| Limpar | `clear` |
| Buscar | `search` |
| Novo | `add` |
| Salvar (loading) | spinner, não ícone |
| Editar | `edit` |
| Excluir | `delete` |
| Ver | `visibility` |
| Download | `download` |
| Mais ações | `more_vert` |
| Upload | `cloud_upload` |
| Fechar | `close` |
| Info / vazio | `info` / `info_outline` |
| Tema | `dark_mode` / `light_mode` |

---

## 11. O que não fazer

- Não usar sidebar larga com texto (isso é outro layout Fuse). Esta spec é **Compact**: só ícones, 80px.
- Não usar header colorido, hero, ilustração, card de estatística no topo da lista (salvo pedido de dashboard).
- Não usar outra paleta (roxo, indigo de marca, laranja de produto).
- Não centralizar o formulário num card estreito tipo “auth”. Formulário é **full width**.
- Não colocar Salvar só com ícone; o rodapé é dois botões largos.
- Não misturar tabela e cards na mesma vista.
- Não desenhar breadcrumb, tabs de módulo, nem FAB flutuante.
- Não usar fonte serif, Inter é a única.
- Não inventar empty state ilustrado. É o card simples da seção 4.
- Não escrever nomes de arquivo, rotas, componentes ou stack no mock — só a tela.

---

## 12. Mini-guia por tipo de pedido

| Pedido do usuário | Template |
|---|---|
| Listar / consultar / acompanhar | 4 — Lista (cards por padrão) |
| Criar / novo / cadastrar | 5 — Edição (sem card de auditoria) |
| Editar / detalhe / ver cadastro | 5 — Edição (com auditoria se houver datas) |
| Escolher tipo / “qual deseja abrir” | 8 — Dialog de escolha |
| Confirmar exclusão | Dialog simples: título + texto + Cancelar / Excluir warn |
| Formulário curto sobre a lista | 8 — Dialog de formulário |
| Dashboard / início | Casco + saudação (avatar, “Olá, NOME” em degradê emerald) + cards de resumo. Sem accordion de filtro. |

---

## 13. Prompt pronto (copiar)

```
Você é um designer de interface. Siga à risca a spec anexada (Fuse Compact + Material).

Tarefa: desenhar a tela de {DESCREVA A TELA}.

Restrições:
- Desktop 1440px, modo claro
- Português do Brasil
- Usar o casco (sidebar 80px + header 64px + conteúdo + footer)
- Reutilizar os templates da spec; não inventar layout, paleta ou grid
- Inventar dados de exemplo realistas
- Entregar mock visual (HTML/CSS ou frame rico), não código de aplicação

{DETALHES: campos, ações, status, se é lista ou form}
```

// Enums compartilhados com o backend — ver documentacao/specs/protocolo-oficio/api-contract.md
// Manter idêntico ao contrato. Não adicionar valores que o backend não emite.

export type StatusMacro =
  | 'EM_ANALISE_REGIONAL'
  | 'EM_ANALISE_ASSESSORIA'
  | 'DEVOLVIDO_AJUSTE'
  | 'EM_DESPACHO'
  | 'EM_EXECUCAO'
  | 'ATENDIDO'
  | 'PARCIALMENTE_ATENDIDO'
  | 'NAO_ATENDIDO'
  | 'CANCELADO';

export type TipoItem =
  | 'ACAO_ATIVIDADE'
  | 'PATROCINIO'
  | 'SOLICITACAO_ITENS'
  | 'CONVITE';

export type StatusItem =
  | 'PENDENTE'
  | 'EM_ANALISE'
  | 'ATENDIDO'
  | 'PARCIALMENTE_ATENDIDO'
  | 'NAO_ATENDIDO'
  | 'ENCAMINHADO';

export type Papel =
  | 'MOBILIZADOR'
  | 'COORDENADOR_REGIONAL'
  | 'ASSESSOR'
  | 'SUPERINTENDENTE'
  | 'DIRETOR_EDUCACIONAL'
  | 'GESTOR'
  | 'COORDENADOR'
  | 'ADMIN';

// Grupos de agrupamento do painel do Mobilizador (HU01 / requirements.md §6)
export type GrupoPainelMobilizador =
  | 'INICIADOS'
  | 'ATENDIDOS'
  | 'PARCIALMENTE'
  | 'CANCELADOS';

export const STATUS_MACRO_LABELS: Record<StatusMacro, string> = {
  EM_ANALISE_REGIONAL: 'Em Análise (Regional)',
  EM_ANALISE_ASSESSORIA: 'Em Análise (Assessoria)',
  DEVOLVIDO_AJUSTE: 'Devolvido para Ajuste',
  EM_DESPACHO: 'Em Despacho',
  EM_EXECUCAO: 'Em Execução',
  ATENDIDO: 'Atendido',
  PARCIALMENTE_ATENDIDO: 'Parcialmente Atendido',
  NAO_ATENDIDO: 'Não Atendido',
  CANCELADO: 'Cancelado',
};

export const TIPO_ITEM_LABELS: Record<TipoItem, string> = {
  ACAO_ATIVIDADE: 'Ação/Atividade',
  PATROCINIO: 'Patrocínio',
  SOLICITACAO_ITENS: 'Solicitação de Itens',
  CONVITE: 'Convite',
};

export const STATUS_ITEM_LABELS: Record<StatusItem, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em Análise',
  ATENDIDO: 'Atendido',
  PARCIALMENTE_ATENDIDO: 'Parcialmente Atendido',
  NAO_ATENDIDO: 'Não Atendido',
  ENCAMINHADO: 'Encaminhado',
};

export const PAPEL_LABELS: Record<Papel, string> = {
  MOBILIZADOR: 'Mobilizador',
  COORDENADOR_REGIONAL: 'Coordenador Regional',
  ASSESSOR: 'Assessor(a) do Superintendente',
  SUPERINTENDENTE: 'Superintendente',
  DIRETOR_EDUCACIONAL: 'Diretor(a) Educacional',
  GESTOR: 'Gestor(a) de Área/Programa',
  COORDENADOR: 'Coordenador(a) da Ação/Programa',
  ADMIN: 'Administrador(a)',
};

/**
 * Classificação visual do chip de status (seção 9 da spec):
 * sucesso (emerald) / atenção (âmbar) / neutro (slate).
 * Não existe chip vermelho para status de negócio.
 */
export function chipTomStatusMacro(status: StatusMacro): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'ATENDIDO':
      return 'success';
    case 'PARCIALMENTE_ATENDIDO':
      return 'warning';
    case 'NAO_ATENDIDO':
    case 'CANCELADO':
      return 'neutral';
    default:
      return 'warning';
  }
}

export function chipTomStatusItem(status: StatusItem): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'ATENDIDO':
      return 'success';
    case 'PARCIALMENTE_ATENDIDO':
    case 'EM_ANALISE':
      return 'warning';
    case 'NAO_ATENDIDO':
    case 'ENCAMINHADO':
    case 'PENDENTE':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/**
 * Agrupamento do painel (requirements.md §6 / design.md §4):
 * abas "Iniciados / Despacho / Atendidos / Parcialmente / Cancelados".
 * A aba "Despacho" só é exibida a papéis internos (nunca ao Mobilizador — HU01).
 *
 * NAO_ATENDIDO é agrupado em "Cancelados" para caber nas 4 abas que o
 * Mobilizador enxerga (Iniciados / Atendidos / Parcialmente / Cancelados),
 * já que a spec de negócio não previu uma 5ª aba para ele.
 */
export type AbaPainel = 'INICIADOS' | 'DESPACHO' | 'ATENDIDOS' | 'PARCIALMENTE' | 'CANCELADOS';

export function abaDoStatusMacro(status: StatusMacro): AbaPainel {
  switch (status) {
    case 'EM_DESPACHO':
      return 'DESPACHO';
    case 'ATENDIDO':
      return 'ATENDIDOS';
    case 'PARCIALMENTE_ATENDIDO':
      return 'PARCIALMENTE';
    case 'CANCELADO':
    case 'NAO_ATENDIDO':
      return 'CANCELADOS';
    default:
      return 'INICIADOS';
  }
}

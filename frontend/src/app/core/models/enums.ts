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

/**
 * Classificação de urgência da demanda — livre, só para priorizar visualmente/
 * filtrar, não altera o fluxo/SLA. Toda solicitação nasce NORMAL (ver
 * CriarSolicitacaoDto no backend).
 */
export type Urgencia = 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';

export const URGENCIA_LABELS: Record<Urgencia, string> = {
  BAIXA: 'Baixa',
  NORMAL: 'Normal',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

/** Tom do chip por urgência — sem vermelho (mesma convenção dos chips de status). */
export function chipTomUrgencia(urgencia: Urgencia): 'neutral' | 'info' | 'warning' | 'purple' {
  switch (urgencia) {
    case 'BAIXA':
      return 'neutral';
    case 'ALTA':
      return 'warning';
    case 'URGENTE':
      return 'purple';
    default:
      return 'info';
  }
}

export type StatusItem =
  | 'PENDENTE'
  | 'EM_ANALISE'
  | 'ATENDIDO'
  | 'PARCIALMENTE_ATENDIDO'
  | 'NAO_ATENDIDO'
  | 'ENCAMINHADO';

export type Papel =
  | 'MOBILIZADOR'
  | 'PRESIDENTE'
  | 'COORDENADOR_REGIONAL'
  | 'ASSESSOR'
  | 'SUPERINTENDENTE'
  | 'DIRETOR_EDUCACIONAL'
  | 'GESTOR'
  | 'COORDENADOR'
  | 'ADMIN';

/**
 * Papéis externos ligados a um único Parceiro, com a mesma autonomia entre si —
 * Presidente do Sindicato tem exatamente as mesmas permissões do Mobilizador
 * (pedido explícito do cliente). Ver PAPEIS_PARCEIRO equivalente no backend.
 */
export const PAPEIS_PARCEIRO: Papel[] = ['MOBILIZADOR', 'PRESIDENTE'];

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
  PRESIDENTE: 'Presidente do Sindicato',
  COORDENADOR_REGIONAL: 'Coordenador Regional',
  ASSESSOR: 'Assessor(a) do Superintendente',
  SUPERINTENDENTE: 'Superintendente',
  DIRETOR_EDUCACIONAL: 'Diretor(a)',
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
 * abas "Iniciados / Despacho / Atendidos / Parcialmente / Não Atendidos / Cancelados".
 * A aba "Despacho" só é exibida a papéis internos (nunca ao Mobilizador — HU01).
 */
export type AbaPainel =
  | 'MEUS_PENDENTES'
  | 'INICIADOS'
  | 'DESPACHO'
  | 'ATENDIDOS'
  | 'PARCIALMENTE'
  | 'NAO_ATENDIDOS'
  | 'CANCELADOS';

export function abaDoStatusMacro(status: StatusMacro): AbaPainel {
  switch (status) {
    case 'EM_DESPACHO':
      return 'DESPACHO';
    case 'ATENDIDO':
      return 'ATENDIDOS';
    case 'PARCIALMENTE_ATENDIDO':
      return 'PARCIALMENTE';
    case 'NAO_ATENDIDO':
      return 'NAO_ATENDIDOS';
    case 'CANCELADO':
      return 'CANCELADOS';
    default:
      return 'INICIADOS';
  }
}

import { Papel, StatusItem, StatusMacro, TipoItem } from './enums';

/**
 * Devolutiva registrada pelo Coordenador da Ação/Programa (HU07/HU09).
 * Visível ao Mobilizador apenas de forma consolidada e somente leitura.
 */
export interface Devolutiva {
  resultado: 'ATENDIDO' | 'PARCIALMENTE_ATENDIDO' | 'NAO_ATENDIDO';
  justificativa?: string;
  dataEvento?: string;
  horario?: string;
  local?: string;
  numeroEventoTurma?: string;
  numeroProcessoAceiteFluig?: string;
  registradoEm?: string;
  registradoPor?: string;
}

/**
 * Item de solicitação — um dos 4 tipos (requirements.md §7).
 * Campos específicos por tipo são todos opcionais aqui porque o
 * formulário dinâmico só preenche os pertinentes ao `tipo` escolhido.
 */
export interface ItemSolicitacao {
  id?: string;
  tipo: TipoItem;

  // Campos comuns a Patrocínio / Solicitação de Itens / Convite
  titulo?: string;
  resumo?: string;
  dataInicio?: string;
  dataFim?: string;

  // Campos específicos de Ação/Atividade
  tipoEvento?: string;
  acaoAtividade?: string;
  disciplina?: string;
  turno?: string;

  // Específico de Solicitação de Itens
  quantidade?: number;

  // Específicos de Convite
  hora?: string;
  local?: string;
  responsavel?: string;
  telefone?: string;

  // Estado do item (HU08) — ausente/irrelevante para o Mobilizador em telas de listagem
  statusItem?: StatusItem;
  areaProgramaId?: string;
  areaProgramaNome?: string;
  coordenadorId?: string;
  coordenadorNome?: string;
  devolutiva?: Devolutiva;

  /**
   * Retrato dos campos preenchidos pelo Mobilizador/Presidente no protocolo —
   * o Coordenador pode corrigir os campos acima; isto aqui nunca muda depois
   * de criado, e serve só para o histórico discreto de alterações na tela.
   */
  valoresOriginais?: {
    tipoEvento?: string;
    acaoAtividade?: string;
    disciplina?: string;
    turno?: string;
    dataInicio?: string;
    dataFim?: string;
  } | null;
}

/** Payload de EditarItem — o Coordenador corrige campos preenchidos pelo Mobilizador/Presidente. */
export interface EditarItemRequest {
  tipoEvento?: string;
  acaoAtividade?: string;
  disciplina?: string;
  turno?: string;
  dataInicio?: string;
  dataFim?: string;
}

/**
 * Registro de tramitação (histórico), append-only.
 * IMPORTANTE (HU01 / api-contract.md): o backend nunca envia este array
 * para usuários com papel MOBILIZADOR. O frontend não deve tentar
 * reconstruir essa informação — apenas renderizar o que vier da API.
 */
export interface Tramitacao {
  id: string;
  de?: string;
  para: string;
  acao: string;
  motivo?: string;
  responsavelNome?: string;
  responsavelPapel?: Papel;
  criadoEm: string;
}

export interface Solicitacao {
  id: string;
  /** Identificador único e destacado do protocolo, gerado pelo sistema (AAAAMMDD + sequência do dia). */
  numeroProcesso?: string;

  parceiroId: string;
  parceiroNome?: string;
  municipio?: string;
  presidenteNome?: string;
  mobilizadorId: string;
  mobilizadorNome?: string;
  coordenadorRegionalNome?: string;

  assunto: string;
  numeroDocumento?: string;
  dataDocumento: string;
  resumoObservacoes?: string;
  anexoOficioId: string;
  anexoOficioNome?: string;

  statusMacro: StatusMacro;

  /**
   * Ausente para o Mobilizador (HU01). Presente para papéis internos.
   */
  etapaAtual?: string;

  /**
   * Diretores escolhidos pelo Superintendente no despacho (HU04) — só eles
   * podem direcionar os itens desta solicitação para uma Área/Programa.
   * Ausente para o Mobilizador (HU01), igual a etapaAtual.
   */
  diretoresDesignadosIds?: string[];

  itens: ItemSolicitacao[];

  criadoEm: string;
  criadoPor?: string;
  alteradoEm?: string;
  alteradoPor?: string;

  avancoAutomatico?: boolean;

  /** Presente quando este protocolo se originou de um e-mail recebido (ver Pré Protocolo). */
  preProtocoloOrigemId?: string;
  /** E-mail de quem enviou o ofício original — só quando veio de e-mail (preProtocoloOrigemId presente). */
  emailRemetenteOrigem?: string;
}

export interface CriarSolicitacaoRequest {
  parceiroId: string;
  mobilizadorId: string;
  municipio?: string;
  assunto: string;
  numeroDocumento?: string;
  dataDocumento: string;
  resumoObservacoes?: string;
  anexoOficioId: string;
  itens: ItemSolicitacao[];
}

/** Um item excluído do fluxo, com uma devolutiva/observação opcional explicando o motivo. */
export interface ItemExcluidoRequest {
  itemId: string;
  observacao?: string;
  /** Omitido = Não Atendido (excluído). Convite (exclusivo da Assessoria) pode ser ATENDIDO diretamente. */
  resultado?: 'ATENDIDO' | 'PARCIALMENTE_ATENDIDO' | 'NAO_ATENDIDO';
}

export interface AnaliseAssessoriaRequest {
  decisao: 'APROVAR' | 'DEVOLVER_AJUSTE' | 'RECUSAR';
  motivo?: string;
  /** Itens que a Assessoria decidiu não incluir no fluxo (ficam "Parcialmente Atendido" automaticamente). */
  itensExcluidos?: ItemExcluidoRequest[];
}

export interface DespachoSuperintendenteRequest {
  diretoriaDestino: 'EDUCACIONAL';
  diretoresIds: string[];
  /** Itens que o Superintendente decidiu não incluir no fluxo (ficam "Parcialmente Atendido" automaticamente). */
  itensExcluidos?: ItemExcluidoRequest[];
}

/** Direciona UM item específico — cada item de uma solicitação pode ir para uma Área diferente. */
export interface DirecionamentoDiretorRequest {
  areaProgramaId: string;
  coordenadorId?: string;
  observacao?: string;
}

export interface DesignarCoordenadorRequest {
  coordenadorId: string;
}

export interface EncaminharItemRequest {
  areaProgramaId: string;
  motivo: string;
}

export interface RegistrarDevolutivaRequest {
  resultado: 'ATENDIDO' | 'PARCIALMENTE_ATENDIDO' | 'NAO_ATENDIDO';
  justificativa?: string;
  dataEvento?: string;
  horario?: string;
  local?: string;
  numeroEventoTurma?: string;
  numeroProcessoAceiteFluig?: string;
}

export interface ListaSolicitacoesFiltro {
  status?: StatusMacro;
  parceiroId?: string;
  regionalId?: string;
  tipoSolicitacao?: TipoItem;
  acaoAtividade?: string;
  disciplina?: string;
  numeroDocumento?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  pageSize?: number;
}

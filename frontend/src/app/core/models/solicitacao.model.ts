import { StatusItem, StatusMacro, TipoItem } from './enums';

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

  // Estado do item (HU08) — ausente/irrelevante para o Mobilizador em telas de listagem
  statusItem?: StatusItem;
  areaProgramaId?: string;
  areaProgramaNome?: string;
  coordenadorId?: string;
  coordenadorNome?: string;
  devolutiva?: Devolutiva;
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
  criadoEm: string;
}

export interface Solicitacao {
  id: string;
  numeroProtocolo?: string;

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

  itens: ItemSolicitacao[];

  /**
   * Ausente para o Mobilizador (HU01). Presente para papéis internos
   * na resposta de GET /api/solicitacoes/:id/historico.
   */
  tramitacoes?: Tramitacao[];

  criadoEm: string;
  criadoPor?: string;
  alteradoEm?: string;
  alteradoPor?: string;

  avancoAutomatico?: boolean;
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

export interface AnaliseAssessoriaRequest {
  decisao: 'APROVAR' | 'DEVOLVER_AJUSTE' | 'RECUSAR';
  motivo?: string;
}

export interface DespachoSuperintendenteRequest {
  diretoriaDestino: 'EDUCACIONAL';
}

export interface DirecionamentoDiretorRequest {
  areaProgramaId: string;
  coordenadorId?: string;
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

import { StatusMacro } from './enums';

export type StatusPreProtocolo = 'PENDENTE' | 'CONVERTIDO' | 'DESCARTADO';

/** Resumo do Protocolo gerado, presente quando o pré-protocolo já foi convertido. */
export interface PreProtocoloSolicitacaoGerada {
  id: string;
  numeroProcesso?: string;
  numeroDocumento?: string;
  statusMacro: StatusMacro;
}

export interface PreProtocolo {
  id: string;
  remetente: string;
  assunto: string;
  corpo?: string;
  anexoOficioId?: string;
  status: StatusPreProtocolo;
  solicitacaoGeradaId?: string;
  solicitacaoGerada?: PreProtocoloSolicitacaoGerada | null;
  convertidoPorId?: string;
  convertidoEm?: string;
  motivoDescarte?: string;
  recebidoEm: string;
}

export interface ListarPreProtocolosFiltro {
  status?: StatusPreProtocolo;
  remetente?: string;
  assunto?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginaPreProtocolos {
  data: PreProtocolo[];
  total: number;
  page: number;
  pageSize: number;
}

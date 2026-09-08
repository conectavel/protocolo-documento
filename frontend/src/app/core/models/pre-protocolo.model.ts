import { StatusMacro } from './enums';

export type StatusPreProtocolo = 'PENDENTE' | 'CONVERTIDO' | 'DESCARTADO';

/** Resumo do Protocolo gerado, presente quando o pré-protocolo já foi convertido. */
export interface PreProtocoloSolicitacaoGerada {
  id: string;
  numeroProcesso?: string;
  numeroDocumento?: string;
  statusMacro: StatusMacro;
}

export type SolicitanteTipo = 'MOBILIZADOR' | 'PRESIDENTE';
export type OrigemPreProtocolo = 'EMAIL' | 'FORMULARIO_PUBLICO';

export interface PreProtocolo {
  id: string;
  remetente: string;
  assunto: string;
  corpo?: string;
  anexoOficioId?: string;
  solicitanteTipo?: SolicitanteTipo | null;
  origem: OrigemPreProtocolo;
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

/** Resposta da busca por CPF no formulário público — usada para pré-preencher a partir de um envio anterior. */
export type BuscaDadosPorCpf =
  | { encontrado: false }
  | {
      encontrado: true;
      nome: string;
      email: string;
      telefone: string | null;
      telefoneWhatsapp: boolean;
      dataNascimento: string | null;
    };

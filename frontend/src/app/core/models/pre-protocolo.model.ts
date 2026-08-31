export type StatusPreProtocolo = 'PENDENTE' | 'CONVERTIDO' | 'DESCARTADO';

export interface PreProtocolo {
  id: string;
  remetente: string;
  assunto: string;
  corpo?: string;
  anexoOficioId?: string;
  status: StatusPreProtocolo;
  solicitacaoGeradaId?: string;
  convertidoPorId?: string;
  convertidoEm?: string;
  motivoDescarte?: string;
  recebidoEm: string;
}

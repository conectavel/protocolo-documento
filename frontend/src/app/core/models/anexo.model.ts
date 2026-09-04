import { ItemSolicitacao } from './solicitacao.model';

export type TipoAnexo = 'OFICIO' | 'DEVOLUTIVA' | 'OUTRO';

export interface Anexo {
  id: string;
  nomeArquivo: string;
  url: string;
  tamanhoBytes?: number;
  mimeType?: string;
}

export interface AnexoMetadados {
  id: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  mimeType: string;
  tipo: TipoAnexo;
}

/** Item da aba "Anexos" do detalhe da solicitação — todos os documentos do processo. */
export interface AnexoProcesso {
  id: string;
  nomeArquivo: string;
  tipo: TipoAnexo;
  tamanhoBytes: number;
  mimeType: string;
  enviadoPor?: string;
  enviadoEm: string;
}

/**
 * Dados para gerar um PDF de ofício padrão a partir do que já foi preenchido
 * na tela — alternativa ao upload manual, para quando o Parceiro/Sindicato
 * não tem um documento próprio pronto (ver GeradorOficioService no backend).
 */
export interface GerarOficioModeloRequest {
  parceiroSigla?: string;
  presidenteNome?: string;
  mobilizadorNome?: string;
  coordenadorRegionalNome?: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  municipio?: string;
  assunto: string;
  numeroDocumento?: string;
  dataDocumento?: string;
  resumoObservacoes?: string;
  itens: ItemSolicitacao[];
}

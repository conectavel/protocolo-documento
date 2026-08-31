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

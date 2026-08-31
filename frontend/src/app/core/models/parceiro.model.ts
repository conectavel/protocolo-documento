export interface Parceiro {
  id: string;
  nome: string;
  presidenteId?: string;
  presidenteNome?: string;
  mobilizadorId?: string;
  mobilizadorNome?: string;
  coordenadorRegionalId?: string;
  coordenadorRegionalNome?: string;
}

export interface Mobilizador {
  id: string;
  nome: string;
  parceiroId: string;
}

export interface CoordenadorRegional {
  id: string;
  nome: string;
}

export interface CoordenadorAreaPrograma {
  id: string;
  nome: string;
}

export interface AreaPrograma {
  id: string;
  codigo: string;
  nome: string;
  gestorId: string;
  gestorNome?: string;
  coordenadores: CoordenadorAreaPrograma[];
}

export interface Municipio {
  id: string;
  nome: string;
}

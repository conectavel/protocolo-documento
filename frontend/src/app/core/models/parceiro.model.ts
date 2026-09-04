export interface Parceiro {
  id: string;
  nome: string;
  presidenteId?: string;
  presidenteNome?: string;
  /**
   * 1 Parceiro tem 1 ou mais Mobilizadores (regra de negócio) — por isso é uma
   * lista, não um único "mobilizadorNome". Quem protocola em nome de um
   * Mobilizador é sempre ele mesmo (usuario.mobilizadorId); esta lista serve
   * para o Presidente escolher em nome de qual Mobilizador está protocolando.
   */
  mobilizadores?: { id: string; nome: string }[];
  coordenadorRegionalId?: string;
  coordenadorRegionalNome?: string;
  /** Informações institucionais do Parceiro/Sindicato — cabeçalho/rodapé do ofício gerado. */
  cnpj?: string;
  endereco?: string;
  telefone?: string;
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

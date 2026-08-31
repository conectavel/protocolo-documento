import { Papel } from './enums';

export interface UsuarioResumo {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
}

export interface Substituicao {
  id: string;
  usuarioSubstituidoId: string;
  usuarioSubstituidoNome?: string;
  usuarioSubstitutoId: string;
  usuarioSubstitutoNome?: string;
  dataInicio: string;
  dataFim: string;
  substituirTodosProcessos: boolean;
  tiposAbrangidos: string[];
  justificativa?: string;
  vigente?: boolean;
  criadoEm?: string;
}

export interface SalvarSubstituicaoRequest {
  usuarioSubstituidoId: string;
  usuarioSubstitutoId: string;
  dataInicio: string;
  dataFim: string;
  substituirTodosProcessos: boolean;
  tiposAbrangidos?: string[];
  justificativa?: string;
}

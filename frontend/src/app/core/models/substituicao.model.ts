import { Papel } from './enums';

export interface UsuarioResumo {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  /** "Pasta"/Departamento do Diretor Educacional (ver Gerenciar Usuários) — usado para identificar a diretoria na lista de Diretores responsáveis. */
  departamento?: string | null;
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
  encerradoEm?: string | null;
  encerradoPorId?: string | null;
  encerradoPorNome?: string;
  encerradaAntecipadamente?: boolean;
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

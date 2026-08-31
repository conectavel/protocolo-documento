import { Papel } from './enums';

export interface Usuario {
  id: string;
  nome: string;
  email?: string;
  papel: Papel;
  areaProgramaId?: string;
  /** Presente apenas quando papel === 'MOBILIZADOR' (resolvido pelo backend via rmCodigoReferencia). */
  parceiroId?: string;
  /** Presente apenas quando papel === 'COORDENADOR_REGIONAL'. */
  coordenadorRegionalId?: string;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  accessToken: string;
  usuario: Usuario;
}

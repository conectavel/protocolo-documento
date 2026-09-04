import { Papel } from './enums';

export interface Usuario {
  id: string;
  nome: string;
  email?: string;
  papel: Papel;
  areaProgramaId?: string;
  /** Presente quando papel === 'MOBILIZADOR' ou 'PRESIDENTE' (resolvido pelo backend via rmCodigoReferencia). */
  parceiroId?: string;
  /** Presente apenas quando papel === 'MOBILIZADOR' — o próprio Mobilizador logado (1 Parceiro tem 1 ou mais). */
  mobilizadorId?: string;
  /** Presente apenas quando papel === 'COORDENADOR_REGIONAL'. */
  coordenadorRegionalId?: string;
}

/** Registro completo de um usuário interno, para a tela "Gerenciar Usuários" (Administrador). */
export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  areaProgramaId?: string;
  ativo: boolean;
  criadoEm: string;
}

export interface ResumoTransferencia {
  itensTransferidos: number;
  solicitacoesTransferidas: number;
  areasTransferidas: number;
}

/** Contexto específico do perfil, para os painéis expansíveis de "Gerenciar Usuários". */
export type ContextoUsuarioAdmin =
  | {
      tipo: 'COORDENADOR_REGIONAL';
      parceiros: { id: string; sigla: string; razaoSocial: string; ativo: boolean }[];
    }
  | {
      tipo: 'GESTOR';
      area: { id: string; codigo: string; nome: string } | null;
      coordenadores: { id: string; nome: string }[];
    }
  | {
      tipo: 'COORDENADOR';
      areas: { id: string; codigo: string; nome: string }[];
      areasAtuaisIds: string[];
    }
  | { tipo: 'DIRETOR_EDUCACIONAL'; departamento: string | null }
  | { tipo: 'OUTRO' };

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  accessToken: string;
  usuario: Usuario;
}

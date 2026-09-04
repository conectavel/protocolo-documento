import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Papel } from '../enums/papel.enum';

export interface IdentidadeSubstituida {
  usuarioId: string;
  nome: string;
  papel: Papel;
  areaProgramaId?: string;
  /** Todas as Áreas/Programa que a identidade pode atender (ver Usuario.areasProgramaIds). */
  areasProgramaIds?: string[];
  parceiroId?: string;
  mobilizadorId?: string;
  coordenadorRegionalId?: string;
}

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  areaProgramaId?: string;
  /** Todas as Áreas/Programa que o usuário pode atender (ver Usuario.areasProgramaIds). */
  areasProgramaIds?: string[];
  parceiroId?: string; // preenchido quando papel = MOBILIZADOR ou PRESIDENTE (ver PAPEIS_PARCEIRO)
  // Preenchido apenas quando papel = MOBILIZADOR — o próprio Mobilizador logado
  // (1 Parceiro tem 1 ou mais Mobilizadores, então não basta saber o Parceiro).
  mobilizadorId?: string;
  coordenadorRegionalId?: string; // preenchido apenas quando papel = COORDENADOR_REGIONAL
  /**
   * Substituições vigentes hoje em que este usuário é o substituto (ver
   * SubstituicoesService) — o RBAC trata cada uma como uma identidade adicional
   * com os mesmos direitos do substituído, sem perder os direitos próprios.
   */
  substituindo?: IdentidadeSubstituida[];
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

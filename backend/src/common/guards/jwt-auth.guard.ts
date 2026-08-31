import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Papel } from '../enums/papel.enum';

export interface IdentidadeSubstituida {
  usuarioId: string;
  nome: string;
  papel: Papel;
  areaProgramaId?: string;
  parceiroId?: string;
  coordenadorRegionalId?: string;
}

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  areaProgramaId?: string;
  parceiroId?: string; // preenchido apenas quando papel = MOBILIZADOR
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

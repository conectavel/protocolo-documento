import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Papel } from '../enums/papel.enum';

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  areaProgramaId?: string;
  parceiroId?: string; // preenchido apenas quando papel = MOBILIZADOR
  coordenadorRegionalId?: string; // preenchido apenas quando papel = COORDENADOR_REGIONAL
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

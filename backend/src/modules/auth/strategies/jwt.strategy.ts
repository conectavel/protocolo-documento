import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { UsuarioAutenticado } from '../../../common/guards/jwt-auth.guard';
import { ParceirosService } from '../../parceiros/parceiros.service';

interface JwtPayload {
  sub: string;
  papel: string;
  areaProgramaId?: string;
  rmCodigoReferencia?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
    private readonly parceirosService: ParceirosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    const usuario = await this.authService.validarUsuarioPorId(payload.sub);
    if (!usuario) {
      throw new UnauthorizedException('Usuário inválido ou inativo.');
    }

    const usuarioAutenticado: UsuarioAutenticado = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      areaProgramaId: usuario.areaProgramaId ?? undefined,
    };

    // Resolve o contexto de hierarquia (parceiroId / coordenadorRegionalId) a partir do vínculo RM,
    // garantindo que o RBAC use sempre o dado mais atual sincronizado do RM/ACORP.
    if (payload.rmCodigoReferencia) {
      if (usuario.papel === 'MOBILIZADOR') {
        const mobilizador = await this.parceirosService.buscarMobilizadorPorRmCodigo(
          payload.rmCodigoReferencia,
        );
        usuarioAutenticado.parceiroId = mobilizador?.parceiroId;
      }
      if (usuario.papel === 'COORDENADOR_REGIONAL') {
        const coordenador = await this.parceirosService.buscarCoordenadorRegionalPorRmCodigo(
          payload.rmCodigoReferencia,
        );
        usuarioAutenticado.coordenadorRegionalId = coordenador?.id;
      }
    }

    return usuarioAutenticado;
  }
}

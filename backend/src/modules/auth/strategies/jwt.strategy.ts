import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { IdentidadeSubstituida, UsuarioAutenticado } from '../../../common/guards/jwt-auth.guard';
import { ParceirosService } from '../../parceiros/parceiros.service';
import { SubstituicoesService } from '../../usuarios/substituicoes.service';
import { Papel } from '../../../common/enums/papel.enum';

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
    private readonly substituicoesService: SubstituicoesService,
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
      areasProgramaIds: usuario.areasProgramaIds,
    };

    await this.resolverContextoRm(usuarioAutenticado, usuario.papel, payload.rmCodigoReferencia);

    // Substituição vigente (equivalente ao "Substitutos" do Fluig): o substituto passa a
    // ter, em adição aos próprios, os direitos do substituído durante o período — ver
    // requirements.md e SubstituicoesService.buscarSubstituicaoAtivaComoSubstituto.
    const substituicaoAtiva = await this.substituicoesService.buscarSubstituicaoAtivaComoSubstituto(usuario.id);
    if (substituicaoAtiva) {
      const substituido = await this.authService.validarUsuarioPorId(substituicaoAtiva.usuarioSubstituidoId);
      if (substituido) {
        const identidade: IdentidadeSubstituida = {
          usuarioId: substituido.id,
          nome: substituido.nome,
          papel: substituido.papel,
          areaProgramaId: substituido.areaProgramaId ?? undefined,
          areasProgramaIds: substituido.areasProgramaIds,
        };
        await this.resolverContextoRm(identidade, substituido.papel, substituido.rmCodigoReferencia);
        usuarioAutenticado.substituindo = [identidade];
      }
    }

    return usuarioAutenticado;
  }

  /** Resolve parceiroId/coordenadorRegionalId a partir do vínculo RM — usado tanto para o
   * usuário logado quanto para uma identidade substituída. */
  private async resolverContextoRm(
    alvo: { parceiroId?: string; mobilizadorId?: string; coordenadorRegionalId?: string },
    papel: Papel,
    rmCodigoReferencia?: string,
  ): Promise<void> {
    if (!rmCodigoReferencia) return;

    if (papel === Papel.MOBILIZADOR) {
      const mobilizador = await this.parceirosService.buscarMobilizadorPorRmCodigo(rmCodigoReferencia);
      alvo.parceiroId = mobilizador?.parceiroId;
      alvo.mobilizadorId = mobilizador?.id;
    }
    if (papel === Papel.PRESIDENTE) {
      const parceiro = await this.parceirosService.buscarParceiroPorPresidenteRmCodigo(rmCodigoReferencia);
      alvo.parceiroId = parceiro?.id;
    }
    if (papel === Papel.COORDENADOR_REGIONAL) {
      const coordenador = await this.parceirosService.buscarCoordenadorRegionalPorRmCodigo(rmCodigoReferencia);
      alvo.coordenadorRegionalId = coordenador?.id;
    }
  }
}

import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Mobilizador } from '../parceiros/entities/mobilizador.entity';
import { Parceiro } from '../parceiros/entities/parceiro.entity';
import { CoordenadorRegional } from '../parceiros/entities/coordenador-regional.entity';
import { Papel } from '../../common/enums/papel.enum';
import { UsuarioAutenticado } from '../../common/guards/jwt-auth.guard';

export interface LoginResponse {
  accessToken: string;
  usuario: UsuarioAutenticado;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Mobilizador) private readonly mobilizadorRepository: Repository<Mobilizador>,
    @InjectRepository(Parceiro) private readonly parceiroRepository: Repository<Parceiro>,
    @InjectRepository(CoordenadorRegional)
    private readonly coordenadorRegionalRepository: Repository<CoordenadorRegional>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, senha: string): Promise<LoginResponse> {
    const usuario = await this.usuarioRepository.findOne({
      where: { email, ativo: true },
      select: ['id', 'nome', 'email', 'senhaHash', 'papel', 'areaProgramaId', 'rmCodigoReferencia'],
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const usuarioAutenticado: UsuarioAutenticado = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      areaProgramaId: usuario.areaProgramaId ?? undefined,
    };

    // Para Mobilizador/Coordenador Regional, o parceiroId/coordenadorRegionalId de contexto
    // é resolvido pelo módulo `parceiros` a partir do rmCodigoReferencia — ver ParceirosService.
    const accessToken = this.jwtService.sign({
      sub: usuario.id,
      papel: usuario.papel,
      areaProgramaId: usuario.areaProgramaId,
      rmCodigoReferencia: usuario.rmCodigoReferencia,
    });

    return { accessToken, usuario: usuarioAutenticado };
  }

  async validarUsuarioPorId(id: string): Promise<Usuario | null> {
    return this.usuarioRepository.findOne({ where: { id, ativo: true } });
  }

  /**
   * Login rápido (tela de Login, modo debug) — lista todos os usuários ativos por
   * papel, para simular qualquer perfil real (não só um exemplo fixo por papel).
   * A senha de todos é a mesma do seed (ver login.component.ts), então não há
   * nada sensível aqui além do que a própria UI de debug já expõe hoje; mesmo
   * assim, fica indisponível em produção.
   *
   * Mobilizador e Presidente têm vínculo com 1 Sindicato (Parceiro) — incluído
   * aqui para a UI poder mostrar "Sindicato - Nome" e facilitar achar o usuário
   * certo numa lista com centenas de entradas.
   */
  async listarUsuariosDebug(): Promise<
    { papel: Papel; nome: string; email: string; sindicato: string | null }[]
  > {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Indisponível em produção.');
    }
    const usuarios = await this.usuarioRepository.find({ where: { ativo: true } });

    const mobilizadores = await this.mobilizadorRepository.find({ relations: ['parceiro'] });
    const sindicatoPorMobilizadorRmCodigo = new Map(
      mobilizadores.map((m) => [m.rmCodigo, m.parceiro?.sigla ?? null]),
    );

    const parceiros = await this.parceiroRepository.find({ relations: ['presidente'] });
    const sindicatoPorPresidenteRmCodigo = new Map(
      parceiros.filter((p) => p.presidente).map((p) => [p.presidente.rmCodigo, p.sigla]),
    );

    const coordenadoresRegionais = await this.coordenadorRegionalRepository.find({
      relations: ['parceiros'],
    });
    const sindicatosPorCoordenadorRmCodigo = new Map(
      coordenadoresRegionais.map((c) => [c.rmCodigo, c.parceiros.map((p) => p.sigla).join(', ')]),
    );

    const resultado = usuarios.map((u) => {
      let sindicato: string | null = null;
      if (u.papel === Papel.MOBILIZADOR) {
        sindicato = sindicatoPorMobilizadorRmCodigo.get(u.rmCodigoReferencia) ?? null;
      } else if (u.papel === Papel.PRESIDENTE) {
        sindicato = sindicatoPorPresidenteRmCodigo.get(u.rmCodigoReferencia) ?? null;
      } else if (u.papel === Papel.COORDENADOR_REGIONAL) {
        sindicato = sindicatosPorCoordenadorRmCodigo.get(u.rmCodigoReferencia) || null;
      }
      return { papel: u.papel, nome: u.nome, email: u.email, sindicato };
    });

    resultado.sort((a, b) => {
      if (a.papel !== b.papel) return a.papel.localeCompare(b.papel);
      const sindicatoA = a.sindicato ?? '';
      const sindicatoB = b.sindicato ?? '';
      if (sindicatoA !== sindicatoB) return sindicatoA.localeCompare(sindicatoB);
      return a.nome.localeCompare(b.nome);
    });

    return resultado;
  }

  async hashSenha(senha: string): Promise<string> {
    return bcrypt.hash(senha, 10);
  }
}

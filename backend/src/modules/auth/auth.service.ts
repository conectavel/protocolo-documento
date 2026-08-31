import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from '../usuarios/entities/usuario.entity';
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

  async hashSenha(senha: string): Promise<string> {
    return bcrypt.hash(senha, 10);
  }
}

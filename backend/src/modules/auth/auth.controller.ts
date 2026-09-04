import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService, LoginResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard, UsuarioAutenticado } from '../../common/guards/jwt-auth.guard';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto.email, dto.senha);
  }

  /** Login rápido (modo debug, fora de produção) — lista todos os usuários por papel. */
  @Get('debug/usuarios')
  listarUsuariosDebug() {
    return this.authService.listarUsuariosDebug();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@UsuarioAtual() usuario: UsuarioAutenticado): UsuarioAutenticado {
    return usuario;
  }
}

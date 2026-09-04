import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard, UsuarioAutenticado } from '../../common/guards/jwt-auth.guard';
import { UsuarioAtual } from '../../common/decorators/usuario-atual.decorator';
import { SubstituicoesService } from './substituicoes.service';
import { CriarSubstituicaoDto } from './dto/substituicao.dto';
import { Usuario } from './entities/usuario.entity';
import { Papel } from '../../common/enums/papel.enum';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class SubstituicoesController {
  constructor(
    private readonly substituicoesService: SubstituicoesService,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  /**
   * Lista enxuta de usuários — usada tanto pelos seletores de substituição
   * quanto (com `?papel=`) para o Superintendente escolher os Diretores
   * responsáveis por uma solicitação no despacho (HU04).
   */
  @Get()
  async listarUsuarios(@Query('papel') papel?: Papel) {
    const usuarios = await this.usuarioRepo.find({
      where: { ativo: true, ...(papel ? { papel } : {}) },
      order: { nome: 'ASC' },
    });
    return usuarios.map((u) => ({ id: u.id, nome: u.nome, email: u.email, papel: u.papel }));
  }

  @Get('substituicoes')
  listar(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.substituicoesService.listar(usuario);
  }

  @Post('substituicoes')
  criar(@Body() dto: CriarSubstituicaoDto, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.substituicoesService.criar(dto, usuario);
  }

  @Put('substituicoes/:id')
  atualizar(@Param('id') id: string, @Body() dto: CriarSubstituicaoDto) {
    return this.substituicoesService.atualizar(id, dto);
  }

  @Delete('substituicoes/:id')
  remover(@Param('id') id: string) {
    return this.substituicoesService.remover(id);
  }
}

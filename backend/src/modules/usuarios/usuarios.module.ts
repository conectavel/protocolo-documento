import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { PreferenciaNotificacao } from './entities/preferencia-notificacao.entity';
import { SubstituicaoUsuario } from './entities/substituicao-usuario.entity';
import { PreferenciasNotificacaoService } from './preferencias-notificacao.service';
import { SubstituicoesService } from './substituicoes.service';
import { UsuariosController } from './usuarios.controller';
import { SubstituicoesController } from './substituicoes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, PreferenciaNotificacao, SubstituicaoUsuario])],
  controllers: [UsuariosController, SubstituicoesController],
  providers: [PreferenciasNotificacaoService, SubstituicoesService],
  exports: [PreferenciasNotificacaoService, SubstituicoesService],
})
export class UsuariosModule {}

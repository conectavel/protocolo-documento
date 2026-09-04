import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { PreferenciaNotificacao } from './entities/preferencia-notificacao.entity';
import { SubstituicaoUsuario } from './entities/substituicao-usuario.entity';
import { ItemSolicitacao } from '../solicitacoes/entities/item-solicitacao.entity';
import { Solicitacao } from '../solicitacoes/entities/solicitacao.entity';
import { AreaPrograma } from '../parceiros/entities/area-programa.entity';
import { ParceirosModule } from '../parceiros/parceiros.module';
import { PreferenciasNotificacaoService } from './preferencias-notificacao.service';
import { SubstituicoesService } from './substituicoes.service';
import { UsuariosAdminService } from './usuarios-admin.service';
import { UsuariosController } from './usuarios.controller';
import { SubstituicoesController } from './substituicoes.controller';
import { UsuariosAdminController } from './usuarios-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      PreferenciaNotificacao,
      SubstituicaoUsuario,
      ItemSolicitacao,
      Solicitacao,
      AreaPrograma,
    ]),
    ParceirosModule,
  ],
  controllers: [UsuariosController, SubstituicoesController, UsuariosAdminController],
  providers: [PreferenciasNotificacaoService, SubstituicoesService, UsuariosAdminService],
  exports: [PreferenciasNotificacaoService, SubstituicoesService],
})
export class UsuariosModule {}

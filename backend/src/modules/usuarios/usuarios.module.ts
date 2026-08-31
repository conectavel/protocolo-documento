import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { PreferenciaNotificacao } from './entities/preferencia-notificacao.entity';
import { PreferenciasNotificacaoService } from './preferencias-notificacao.service';
import { UsuariosController } from './usuarios.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, PreferenciaNotificacao])],
  controllers: [UsuariosController],
  providers: [PreferenciasNotificacaoService],
  exports: [PreferenciasNotificacaoService],
})
export class UsuariosModule {}

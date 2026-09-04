import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreProtocolo } from './entities/pre-protocolo.entity';
import { Solicitacao } from '../solicitacoes/entities/solicitacao.entity';
import { PreProtocolosService } from './pre-protocolos.service';
import { PreProtocolosController } from './pre-protocolos.controller';
import { AnexosModule } from '../anexos/anexos.module';
import { SolicitacoesModule } from '../solicitacoes/solicitacoes.module';

@Module({
  imports: [TypeOrmModule.forFeature([PreProtocolo, Solicitacao]), AnexosModule, SolicitacoesModule],
  controllers: [PreProtocolosController],
  providers: [PreProtocolosService],
})
export class PreProtocolosModule {}

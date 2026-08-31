import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parceiro } from './entities/parceiro.entity';
import { Presidente } from './entities/presidente.entity';
import { Mobilizador } from './entities/mobilizador.entity';
import { CoordenadorRegional } from './entities/coordenador-regional.entity';
import { AreaPrograma } from './entities/area-programa.entity';
import { ParceirosService } from './parceiros.service';
import { ParceirosController } from './parceiros.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parceiro, Presidente, Mobilizador, CoordenadorRegional, AreaPrograma]),
  ],
  controllers: [ParceirosController],
  providers: [ParceirosService],
  exports: [ParceirosService],
})
export class ParceirosModule {}

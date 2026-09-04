import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anexo } from './entities/anexo.entity';
import { AnexosService } from './anexos.service';
import { AnexosController } from './anexos.controller';
import { GeradorOficioService } from './gerador-oficio.service';

@Module({
  imports: [TypeOrmModule.forFeature([Anexo])],
  controllers: [AnexosController],
  providers: [AnexosService, GeradorOficioService],
  exports: [AnexosService],
})
export class AnexosModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anexo } from './entities/anexo.entity';
import { AnexosService } from './anexos.service';
import { AnexosController } from './anexos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Anexo])],
  controllers: [AnexosController],
  providers: [AnexosService],
  exports: [AnexosService],
})
export class AnexosModule {}

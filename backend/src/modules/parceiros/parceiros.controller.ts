import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParceirosService } from './parceiros.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ParceirosController {
  constructor(private readonly parceirosService: ParceirosService) {}

  @Get('parceiros')
  listar(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.parceirosService.listarParceiros(search, Number(page ?? '1'), Number(pageSize ?? '10'));
  }

  @Get('parceiros/:id')
  buscarPorId(@Param('id') id: string) {
    return this.parceirosService.buscarParceiroPorId(id);
  }

  @Get('mobilizadores')
  listarMobilizadores(@Query('parceiroId') parceiroId?: string) {
    return this.parceirosService.listarMobilizadores(parceiroId);
  }

  @Get('coordenadores-regionais')
  listarCoordenadoresRegionais() {
    return this.parceirosService.listarCoordenadoresRegionais();
  }

  @Get('areas-programa')
  listarAreasPrograma() {
    return this.parceirosService.listarAreasPrograma();
  }
}

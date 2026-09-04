import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PreferenciaNotificacao } from './entities/preferencia-notificacao.entity';
import { CATALOGO_NOTIFICACOES } from './notificacao-catalogo';
import { Papel } from '../../common/enums/papel.enum';
import { AtualizarPreferenciasDto } from './dto/atualizar-preferencias.dto';

@Injectable()
export class PreferenciasNotificacaoService {
  constructor(
    @InjectRepository(PreferenciaNotificacao)
    private readonly preferenciaRepo: Repository<PreferenciaNotificacao>,
  ) {}

  async buscarMinhas(usuarioId: string, papel: Papel) {
    const tiposDisponiveis = CATALOGO_NOTIFICACOES[papel] ?? [];
    let preferencia = await this.preferenciaRepo.findOne({ where: { usuarioId } });

    if (!preferencia) {
      // Primeiro acesso: cria com todos os tipos do papel habilitados por padrão no canal sistema.
      preferencia = await this.preferenciaRepo.save(
        this.preferenciaRepo.create({
          usuarioId,
          canalSistema: true,
          canalPush: false,
          canalEmail: false,
          tiposAtivos: tiposDisponiveis.map((t) => t.codigo),
        }),
      );
    }

    return {
      canalSistema: preferencia.canalSistema,
      canalPush: preferencia.canalPush,
      canalEmail: preferencia.canalEmail,
      tiposAtivos: preferencia.tiposAtivos,
      tiposDisponiveis,
      atualizadoEm: preferencia.atualizadoEm,
    };
  }

  async atualizar(usuarioId: string, papel: Papel, dto: AtualizarPreferenciasDto) {
    const codigosValidos = new Set((CATALOGO_NOTIFICACOES[papel] ?? []).map((t) => t.codigo));
    const tiposAtivos = dto.tiposAtivos.filter((codigo) => codigosValidos.has(codigo));

    let preferencia = await this.preferenciaRepo.findOne({ where: { usuarioId } });
    if (!preferencia) {
      preferencia = this.preferenciaRepo.create({ usuarioId });
    }

    preferencia.canalSistema = dto.canalSistema;
    preferencia.canalPush = dto.canalPush;
    preferencia.canalEmail = dto.canalEmail;
    preferencia.tiposAtivos = tiposAtivos;

    await this.preferenciaRepo.save(preferencia);
    return this.buscarMinhas(usuarioId, papel);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RmMiddlewareClient } from './rm-middleware.client';
import { Parceiro } from '../parceiros/entities/parceiro.entity';
import { Presidente } from '../parceiros/entities/presidente.entity';
import { Mobilizador } from '../parceiros/entities/mobilizador.entity';
import { CoordenadorRegional } from '../parceiros/entities/coordenador-regional.entity';
import { SincronizacaoRm, EntidadeRm } from './entities/sincronizacao-rm.entity';

export interface EventoWebhookRm {
  entidade: EntidadeRm;
  rmCodigo: string;
  operacao: 'CRIADO' | 'ATUALIZADO' | 'INATIVADO';
  payload: Record<string, any>;
  timestamp: string;
}

/**
 * Núcleo da sincronização com o RM Middleware. Garante que uma atualização feita pelo ACORP
 * no RM se reflita automaticamente nas tabelas espelho locais — e, por consequência, em qualquer
 * solicitação já aberta que referencie essas entidades (a solicitação guarda FK, não cópia).
 */
@Injectable()
export class RmIntegrationService {
  private readonly logger = new Logger(RmIntegrationService.name);

  constructor(
    private readonly rmClient: RmMiddlewareClient,
    @InjectRepository(Parceiro) private readonly parceiroRepo: Repository<Parceiro>,
    @InjectRepository(Presidente) private readonly presidenteRepo: Repository<Presidente>,
    @InjectRepository(Mobilizador) private readonly mobilizadorRepo: Repository<Mobilizador>,
    @InjectRepository(CoordenadorRegional)
    private readonly coordenadorRepo: Repository<CoordenadorRegional>,
    @InjectRepository(SincronizacaoRm) private readonly syncLogRepo: Repository<SincronizacaoRm>,
  ) {}

  /** Executado pelo job periódico (fallback) — busca deltas desde a última sincronização com sucesso. */
  async sincronizarTudo(atualizadoDesde?: Date): Promise<void> {
    await this.sincronizarCoordenadoresRegionais(atualizadoDesde);
    await this.sincronizarPresidentes(atualizadoDesde);
    await this.sincronizarParceiros(atualizadoDesde); // depende de coordenadores/presidentes já upsertados
    await this.sincronizarMobilizadores(atualizadoDesde); // popula parceiro.mobilizadorId
  }

  async sincronizarCoordenadoresRegionais(atualizadoDesde?: Date): Promise<void> {
    const itens = await this.rmClient.listarCoordenadoresRegionais(atualizadoDesde);
    for (const item of itens) {
      await this.upsertRegistro(
        this.coordenadorRepo,
        { rmCodigo: item.rmCodigo },
        {
          rmCodigo: item.rmCodigo,
          nome: item.nome,
          email: item.email,
          ativo: item.ativo,
          ultimaSincronizacaoRm: new Date(),
        },
        'COORDENADOR_REGIONAL',
        item.rmCodigo,
      );
    }
  }

  async sincronizarPresidentes(atualizadoDesde?: Date): Promise<void> {
    const itens = await this.rmClient.listarPresidentes(atualizadoDesde);
    for (const item of itens) {
      await this.upsertRegistro(
        this.presidenteRepo,
        { rmCodigo: item.rmCodigo },
        {
          rmCodigo: item.rmCodigo,
          nome: item.nome,
          email: item.email,
          ativo: item.ativo,
          ultimaSincronizacaoRm: new Date(),
        },
        'PRESIDENTE',
        item.rmCodigo,
      );
    }
  }

  async sincronizarParceiros(atualizadoDesde?: Date): Promise<void> {
    const itens = await this.rmClient.listarParceiros(atualizadoDesde);
    for (const item of itens) {
      const coordenador = await this.coordenadorRepo.findOne({
        where: { rmCodigo: item.coordenadorRegionalRmCodigo },
      });
      const presidente = await this.presidenteRepo.findOne({
        where: { rmCodigo: item.presidenteRmCodigo },
      });

      if (!coordenador || !presidente) {
        await this.registrarErro(
          'PARCEIRO',
          item.rmCodigo,
          'Coordenador Regional ou Presidente ainda não sincronizado — parceiro será reprocessado no próximo ciclo.',
        );
        continue;
      }

      await this.upsertRegistro(
        this.parceiroRepo,
        { rmCodigo: item.rmCodigo },
        {
          rmCodigo: item.rmCodigo,
          sigla: item.sigla,
          razaoSocial: item.razaoSocial,
          ativo: item.ativo,
          coordenadorRegionalId: coordenador.id,
          presidenteId: presidente.id,
          ultimaSincronizacaoRm: new Date(),
        },
        'PARCEIRO',
        item.rmCodigo,
      );
    }
  }

  async sincronizarMobilizadores(atualizadoDesde?: Date): Promise<void> {
    const itens = await this.rmClient.listarMobilizadores(atualizadoDesde);
    for (const item of itens) {
      const parceiro = await this.parceiroRepo.findOne({ where: { rmCodigo: item.parceiroRmCodigo } });
      if (!parceiro) {
        await this.registrarErro(
          'MOBILIZADOR',
          item.rmCodigo,
          'Parceiro ainda não sincronizado — mobilizador será reprocessado no próximo ciclo.',
        );
        continue;
      }

      const mobilizador = await this.upsertRegistro(
        this.mobilizadorRepo,
        { rmCodigo: item.rmCodigo },
        {
          rmCodigo: item.rmCodigo,
          nome: item.nome,
          email: item.email,
          ativo: item.ativo,
          parceiroId: parceiro.id,
          ultimaSincronizacaoRm: new Date(),
        },
        'MOBILIZADOR',
        item.rmCodigo,
      );

      // Regra de negócio: 1 Parceiro possui exatamente 1 Mobilizador.
      if (parceiro.mobilizadorId !== mobilizador.id) {
        parceiro.mobilizadorId = mobilizador.id;
        await this.parceiroRepo.save(parceiro);
      }
    }
  }

  /** Recebido do webhook do RM Middleware — aplica a atualização imediatamente (tempo real). */
  async processarEventoWebhook(evento: EventoWebhookRm): Promise<void> {
    switch (evento.entidade) {
      case 'COORDENADOR_REGIONAL':
        await this.sincronizarCoordenadoresRegionais();
        break;
      case 'PRESIDENTE':
        await this.sincronizarPresidentes();
        break;
      case 'PARCEIRO':
        await this.sincronizarParceiros();
        break;
      case 'MOBILIZADOR':
        await this.sincronizarMobilizadores();
        break;
    }
  }

  private async upsertRegistro<T extends { id: string }>(
    repo: Repository<T>,
    where: Partial<T>,
    dados: Partial<T>,
    entidade: EntidadeRm,
    rmCodigo: string,
  ): Promise<T> {
    try {
      let registro = await repo.findOne({ where: where as any });
      if (registro) {
        repo.merge(registro, dados as any);
      } else {
        registro = repo.create(dados as any) as unknown as T;
      }
      const salvo = await repo.save(registro as any);
      await this.syncLogRepo.save(
        this.syncLogRepo.create({
          entidade,
          entidadeId: salvo.id,
          rmCodigo,
          status: 'OK',
          origem: 'WEBHOOK',
        }),
      );
      return salvo;
    } catch (erro) {
      await this.registrarErro(entidade, rmCodigo, erro.message);
      throw erro;
    }
  }

  private async registrarErro(entidade: EntidadeRm, rmCodigo: string, detalhe: string): Promise<void> {
    this.logger.warn(`Sincronização RM falhou [${entidade}/${rmCodigo}]: ${detalhe}`);
    await this.syncLogRepo.save(
      this.syncLogRepo.create({ entidade, rmCodigo, status: 'ERRO', detalheErro: detalhe }),
    );
  }
}

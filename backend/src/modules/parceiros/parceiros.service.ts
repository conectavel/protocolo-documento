import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parceiro } from './entities/parceiro.entity';
import { Presidente } from './entities/presidente.entity';
import { Mobilizador } from './entities/mobilizador.entity';
import { CoordenadorRegional } from './entities/coordenador-regional.entity';
import { AreaPrograma } from './entities/area-programa.entity';

/**
 * Acesso somente-leitura às entidades sincronizadas do RM/ACORP (via RM Middleware).
 * Nenhum método aqui escreve nessas tabelas fora do módulo `rm-integration` — a UI deste
 * sistema nunca cria/edita Parceiro, Presidente, Mobilizador ou Coordenador Regional.
 */
@Injectable()
export class ParceirosService {
  constructor(
    @InjectRepository(Parceiro) private readonly parceiroRepo: Repository<Parceiro>,
    @InjectRepository(Presidente) private readonly presidenteRepo: Repository<Presidente>,
    @InjectRepository(Mobilizador) private readonly mobilizadorRepo: Repository<Mobilizador>,
    @InjectRepository(CoordenadorRegional)
    private readonly coordenadorRepo: Repository<CoordenadorRegional>,
    @InjectRepository(AreaPrograma) private readonly areaProgramaRepo: Repository<AreaPrograma>,
  ) {}

  async listarParceiros(search?: string, page = 1, pageSize = 10) {
    const qb = this.parceiroRepo
      .createQueryBuilder('parceiro')
      .leftJoinAndSelect('parceiro.presidente', 'presidente')
      .leftJoinAndSelect('parceiro.mobilizador', 'mobilizador')
      .leftJoinAndSelect('parceiro.coordenadorRegional', 'coordenadorRegional')
      .where('parceiro.ativo = true');

    if (search) {
      qb.andWhere('(parceiro.sigla ILIKE :s OR parceiro.razaoSocial ILIKE :s)', {
        s: `%${search}%`,
      });
    }

    const [parceiros, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: parceiros.map((parceiro) => this.mapParceiro(parceiro)),
      total,
      page,
      pageSize,
    };
  }

  async buscarParceiroPorId(id: string): Promise<ReturnType<typeof this.mapParceiro>> {
    const parceiro = await this.parceiroRepo.findOne({
      where: { id },
      relations: ['presidente', 'mobilizador', 'coordenadorRegional'],
    });
    if (!parceiro) {
      throw new NotFoundException('Parceiro não encontrado.');
    }
    return this.mapParceiro(parceiro);
  }

  /**
   * Achata as relações do Parceiro em campos "*Nome" para consumo direto pelo frontend
   * (ver api-contract.md e as telas de Identificação do Solicitante / painel de ofícios).
   */
  private mapParceiro(parceiro: Parceiro) {
    return {
      ...parceiro,
      nome: parceiro.sigla,
      presidenteNome: parceiro.presidente?.nome,
      mobilizadorNome: parceiro.mobilizador?.nome,
      coordenadorRegionalNome: parceiro.coordenadorRegional?.nome,
    };
  }

  async listarMobilizadores(parceiroId?: string): Promise<Mobilizador[]> {
    return this.mobilizadorRepo.find({
      where: parceiroId ? { parceiroId, ativo: true } : { ativo: true },
    });
  }

  async listarCoordenadoresRegionais(): Promise<CoordenadorRegional[]> {
    return this.coordenadorRepo.find({ where: { ativo: true } });
  }

  async listarAreasPrograma(): Promise<AreaPrograma[]> {
    return this.areaProgramaRepo.find({ relations: ['gestor', 'coordenadores'] });
  }

  async buscarMobilizadorPorRmCodigo(rmCodigo: string): Promise<Mobilizador | null> {
    return this.mobilizadorRepo.findOne({ where: { rmCodigo } });
  }

  async buscarCoordenadorRegionalPorRmCodigo(rmCodigo: string): Promise<CoordenadorRegional | null> {
    return this.coordenadorRepo.findOne({ where: { rmCodigo } });
  }

  /** Usado pelo rm-integration para upsert vindo do webhook/job de sincronização. */
  get repositorios() {
    return {
      parceiro: this.parceiroRepo,
      presidente: this.presidenteRepo,
      mobilizador: this.mobilizadorRepo,
      coordenadorRegional: this.coordenadorRepo,
    };
  }
}

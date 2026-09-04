import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parceiro } from './entities/parceiro.entity';
import { Presidente } from './entities/presidente.entity';
import { Mobilizador } from './entities/mobilizador.entity';
import { CoordenadorRegional } from './entities/coordenador-regional.entity';
import { AreaPrograma } from './entities/area-programa.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Papel } from '../../common/enums/papel.enum';

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
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  async listarParceiros(search?: string, page = 1, pageSize = 10) {
    const qb = this.parceiroRepo
      .createQueryBuilder('parceiro')
      .leftJoinAndSelect('parceiro.presidente', 'presidente')
      .leftJoinAndSelect('parceiro.mobilizadores', 'mobilizadores')
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
      relations: ['presidente', 'mobilizadores', 'coordenadorRegional'],
    });
    if (!parceiro) {
      throw new NotFoundException('Parceiro não encontrado.');
    }
    return this.mapParceiro(parceiro);
  }

  /**
   * Achata as relações do Parceiro em campos "*Nome" para consumo direto pelo frontend
   * (ver api-contract.md e as telas de Identificação do Solicitante / painel de ofícios).
   * `mobilizadores` é uma lista (não um único "mobilizadorNome") porque 1 Parceiro tem
   * 1 ou mais Mobilizadores — quem protocola escolhe/identifica o seu próprio, não "o"
   * mobilizador do Parceiro.
   */
  private mapParceiro(parceiro: Parceiro) {
    return {
      ...parceiro,
      nome: parceiro.sigla,
      presidenteNome: parceiro.presidente?.nome,
      mobilizadores: parceiro.mobilizadores?.map((m) => ({ id: m.id, nome: m.nome })) ?? [],
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

  /**
   * A relação "coordenadores" do TypeORM só olha `areaProgramaId` (a área
   * "principal"), mas um Coordenador pode atender mais de uma Área/Programa
   * (Usuario.areasProgramaIds, gerenciado em "Gerenciar Usuários") — por isso
   * a lista é montada manualmente, considerando as duas fontes.
   */
  async listarAreasPrograma(): Promise<(AreaPrograma & { coordenadores: Usuario[] })[]> {
    const [areas, coordenadores] = await Promise.all([
      this.areaProgramaRepo.find({ relations: ['gestor'] }),
      this.usuarioRepo.find({ where: { papel: Papel.COORDENADOR, ativo: true } }),
    ]);

    return areas.map((area) => ({
      ...area,
      gestorNome: area.gestor?.nome,
      coordenadores: coordenadores.filter((coordenador) =>
        coordenador.areasProgramaIds?.length
          ? coordenador.areasProgramaIds.includes(area.id)
          : coordenador.areaProgramaId === area.id
      ),
    }));
  }

  /** Sindicatos/Parceiros atendidos por este Coordenador Regional — nem todo sindicato do RM é parceiro do SENAR-GO. */
  async listarParceirosPorCoordenadorRegional(coordenadorRegionalId: string): Promise<Parceiro[]> {
    return this.parceiroRepo.find({ where: { coordenadorRegionalId }, order: { sigla: 'ASC' } });
  }

  async buscarMobilizadorPorRmCodigo(rmCodigo: string): Promise<Mobilizador | null> {
    return this.mobilizadorRepo.findOne({ where: { rmCodigo } });
  }

  async buscarCoordenadorRegionalPorRmCodigo(rmCodigo: string): Promise<CoordenadorRegional | null> {
    return this.coordenadorRepo.findOne({ where: { rmCodigo } });
  }

  /**
   * Resolve o Parceiro de um Presidente a partir do rm_codigo — diferente do
   * Mobilizador, o vínculo fica só no lado do Parceiro (`parceiro.presidenteId`),
   * então é uma busca em duas etapas: Presidente por rm_codigo, depois Parceiro
   * por presidenteId.
   */
  async buscarParceiroPorPresidenteRmCodigo(rmCodigo: string): Promise<Parceiro | null> {
    const presidente = await this.presidenteRepo.findOne({ where: { rmCodigo } });
    if (!presidente) return null;
    return this.parceiroRepo.findOne({ where: { presidenteId: presidente.id } });
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

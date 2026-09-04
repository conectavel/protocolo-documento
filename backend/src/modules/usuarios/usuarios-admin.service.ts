import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { ItemSolicitacao } from '../solicitacoes/entities/item-solicitacao.entity';
import { Solicitacao } from '../solicitacoes/entities/solicitacao.entity';
import { AreaPrograma } from '../parceiros/entities/area-programa.entity';
import { ParceirosService } from '../parceiros/parceiros.service';
import { Papel, PAPEIS_INTERNOS } from '../../common/enums/papel.enum';

/**
 * Perfis administráveis por "Gerenciar Usuários" (adicionar/mover usuário entre perfis).
 * `PAPEIS_INTERNOS` inclui Coordenador Regional, mas esse perfil — assim como Mobilizador
 * e Presidente — é sincronizado do RM/ACORP e não pode ser atribuído manualmente aqui.
 */
const PAPEIS_GERENCIAVEIS: Papel[] = PAPEIS_INTERNOS.filter((papel) => papel !== Papel.COORDENADOR_REGIONAL);
import { StatusItem, StatusMacro } from '../../common/enums/solicitacao.enum';

export type ContextoUsuarioAdmin =
  | { tipo: 'COORDENADOR_REGIONAL'; parceiros: { id: string; sigla: string; razaoSocial: string; ativo: boolean }[] }
  | {
      tipo: 'GESTOR';
      area: { id: string; codigo: string; nome: string } | null;
      coordenadores: { id: string; nome: string }[];
    }
  | {
      tipo: 'COORDENADOR';
      areas: { id: string; codigo: string; nome: string }[];
      areasAtuaisIds: string[];
    }
  | { tipo: 'DIRETOR_EDUCACIONAL'; departamento: string | null }
  | { tipo: 'OUTRO' };

/** Itens ainda em aberto — o que já foi finalizado (devolutiva registrada) permanece como histórico do usuário que saiu. */
const ITENS_ABERTOS: StatusItem[] = [StatusItem.PENDENTE, StatusItem.EM_ANALISE, StatusItem.ENCAMINHADO];

/** Solicitações ainda em andamento na fase de direcionamento/execução (onde faz sentido reatribuir um Diretor). */
const SOLICITACOES_ABERTAS: StatusMacro[] = [StatusMacro.EM_DESPACHO, StatusMacro.EM_EXECUCAO];

export interface ResumoTransferencia {
  itensTransferidos: number;
  solicitacoesTransferidas: number;
  areasTransferidas: number;
}

/**
 * Suporte à tela "Gerenciar Usuários" do Administrador — listar/ativar/desativar
 * e, em caso de desligamento, transferir o trabalho em aberto (HU-admin, sem
 * número formal ainda) para outro usuário. Colocar um substituto temporário
 * já é coberto pelo módulo de Substituições existente (ver SubstituicoesService).
 */
@Injectable()
export class UsuariosAdminService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(ItemSolicitacao) private readonly itemRepo: Repository<ItemSolicitacao>,
    @InjectRepository(Solicitacao) private readonly solicitacaoRepo: Repository<Solicitacao>,
    @InjectRepository(AreaPrograma) private readonly areaRepo: Repository<AreaPrograma>,
    private readonly parceirosService: ParceirosService,
  ) {}

  async listar(): Promise<Usuario[]> {
    return this.usuarioRepo.find({ order: { papel: 'ASC', nome: 'ASC' } });
  }

  /**
   * Contexto específico do perfil, para os painéis expansíveis de "Gerenciar
   * Usuários": os sindicatos de um Coordenador Regional, a Área/Programa e os
   * Coordenadores de um Gestor, as Áreas/Programa de um Coordenador (podendo
   * ser mais de uma) e a Pasta/Departamento de um Diretor.
   */
  async buscarContexto(id: string): Promise<ContextoUsuarioAdmin> {
    const usuario = await this.usuarioRepo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');

    if (usuario.papel === Papel.COORDENADOR_REGIONAL) {
      const coordenadorRegional = usuario.rmCodigoReferencia
        ? await this.parceirosService.buscarCoordenadorRegionalPorRmCodigo(usuario.rmCodigoReferencia)
        : null;
      const parceiros = coordenadorRegional
        ? await this.parceirosService.listarParceirosPorCoordenadorRegional(coordenadorRegional.id)
        : [];
      return {
        tipo: 'COORDENADOR_REGIONAL',
        parceiros: parceiros.map((p) => ({ id: p.id, sigla: p.sigla, razaoSocial: p.razaoSocial, ativo: p.ativo })),
      };
    }

    if (usuario.papel === Papel.GESTOR) {
      const area = await this.areaRepo.findOne({ where: { gestorId: id } });
      const coordenadores = area
        ? await this.usuarioRepo.find({ where: { papel: Papel.COORDENADOR, ativo: true } })
        : [];
      return {
        tipo: 'GESTOR',
        area: area ? { id: area.id, codigo: area.codigo, nome: area.nome } : null,
        coordenadores: area
          ? coordenadores
              .filter((c) =>
                c.areasProgramaIds?.length ? c.areasProgramaIds.includes(area.id) : c.areaProgramaId === area.id
              )
              .map((c) => ({ id: c.id, nome: c.nome }))
          : [],
      };
    }

    if (usuario.papel === Papel.COORDENADOR) {
      const areas = await this.areaRepo.find({ order: { nome: 'ASC' } });
      const areasAtuaisIds = usuario.areasProgramaIds?.length
        ? usuario.areasProgramaIds
        : usuario.areaProgramaId
          ? [usuario.areaProgramaId]
          : [];
      return {
        tipo: 'COORDENADOR',
        areas: areas.map((a) => ({ id: a.id, codigo: a.codigo, nome: a.nome })),
        areasAtuaisIds,
      };
    }

    if (usuario.papel === Papel.DIRETOR_EDUCACIONAL) {
      return { tipo: 'DIRETOR_EDUCACIONAL', departamento: usuario.departamento };
    }

    return { tipo: 'OUTRO' };
  }

  /** Admin ajusta as Áreas/Programa de um Coordenador (pode atender mais de uma; ao menos uma é obrigatória). */
  async atualizarAreas(id: string, areasProgramaIds: string[]): Promise<Usuario> {
    if (areasProgramaIds.length === 0) {
      throw new ConflictException('Selecione ao menos uma Área/Programa.');
    }
    const usuario = await this.usuarioRepo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');
    usuario.areasProgramaIds = areasProgramaIds;
    // Mantém a área "principal" coerente com a nova lista, para quem ainda lê areaProgramaId diretamente.
    usuario.areaProgramaId = areasProgramaIds[0];
    await this.usuarioRepo.save(usuario);
    return usuario;
  }

  /** Admin define a Pasta/Departamento de um Diretor Educacional (hoje só informativo). */
  async atualizarDepartamento(id: string, departamento: string): Promise<Usuario> {
    const usuario = await this.usuarioRepo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');
    usuario.departamento = departamento;
    await this.usuarioRepo.save(usuario);
    return usuario;
  }

  async atualizarStatus(id: string, ativo: boolean): Promise<Usuario> {
    const usuario = await this.usuarioRepo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');
    usuario.ativo = ativo;
    await this.usuarioRepo.save(usuario);
    return usuario;
  }

  /**
   * Move um usuário interno já existente (de qualquer outro perfil interno) para um
   * novo perfil — ex.: promover alguém a Administrador, ou realocar um Coordenador
   * para Assessor. Ele deixa de atuar no perfil anterior — os vínculos específicos
   * daquele perfil (área/programa, departamento, etc.) permanecem no registro, mas
   * passam a ser irrelevantes no novo perfil. Restrito aos perfis internos: os
   * perfis sincronizados do RM (Coordenador Regional, Mobilizador, Presidente) só
   * são administrados pela própria sincronização, nunca por esta tela.
   */
  async alterarPapel(id: string, novoPapel: Papel): Promise<Usuario> {
    if (!PAPEIS_GERENCIAVEIS.includes(novoPapel)) {
      throw new ConflictException('Este perfil é sincronizado do RM e não pode ser atribuído manualmente.');
    }
    const usuario = await this.usuarioRepo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');
    if (!PAPEIS_GERENCIAVEIS.includes(usuario.papel)) {
      throw new ConflictException('Este usuário tem um perfil sincronizado do RM e não pode ser movido por aqui.');
    }
    if (usuario.papel === novoPapel) {
      return usuario;
    }
    usuario.papel = novoPapel;
    await this.usuarioRepo.save(usuario);
    return usuario;
  }

  /**
   * Desligamento — transfere para outro usuário: itens de Coordenador ainda
   * não finalizados, solicitações onde ele está designado como um dos
   * Diretores e ainda em execução, e a titularidade de Área/Programa (quando
   * ele for o Gestor). Trabalho já concluído (devolutivas registradas)
   * permanece como estava, como histórico.
   */
  async transferirProcessos(usuarioOrigemId: string, paraUsuarioId: string): Promise<ResumoTransferencia> {
    if (usuarioOrigemId === paraUsuarioId) {
      throw new ConflictException('Selecione um usuário diferente para receber os processos.');
    }
    const [origem, destino] = await Promise.all([
      this.usuarioRepo.findOne({ where: { id: usuarioOrigemId } }),
      this.usuarioRepo.findOne({ where: { id: paraUsuarioId } }),
    ]);
    if (!origem) throw new NotFoundException('Usuário de origem não encontrado.');
    if (!destino) throw new NotFoundException('Usuário de destino não encontrado.');

    const itensAbertos = await this.itemRepo.find({
      where: { coordenadorResponsavelId: usuarioOrigemId, statusItem: In(ITENS_ABERTOS) },
    });
    for (const item of itensAbertos) {
      await this.itemRepo.update(item.id, { coordenadorResponsavelId: paraUsuarioId });
    }

    const solicitacoesAbertas = await this.solicitacaoRepo.find({
      where: { statusMacro: In(SOLICITACOES_ABERTAS) },
    });
    let solicitacoesTransferidas = 0;
    for (const solicitacao of solicitacoesAbertas) {
      if (!solicitacao.diretoresDesignadosIds?.includes(usuarioOrigemId)) {
        continue;
      }
      const novosIds = solicitacao.diretoresDesignadosIds.filter((id) => id !== usuarioOrigemId);
      if (!novosIds.includes(paraUsuarioId)) {
        novosIds.push(paraUsuarioId);
      }
      await this.solicitacaoRepo.update(solicitacao.id, { diretoresDesignadosIds: novosIds });
      solicitacoesTransferidas++;
    }

    const areas = await this.areaRepo.find({ where: { gestorId: usuarioOrigemId } });
    for (const area of areas) {
      await this.areaRepo.update(area.id, { gestorId: paraUsuarioId });
    }

    return {
      itensTransferidos: itensAbertos.length,
      solicitacoesTransferidas,
      areasTransferidas: areas.length,
    };
  }
}

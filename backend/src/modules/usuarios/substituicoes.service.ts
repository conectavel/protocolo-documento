import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstituicaoUsuario } from './entities/substituicao-usuario.entity';
import { Usuario } from './entities/usuario.entity';
import { CriarSubstituicaoDto } from './dto/substituicao.dto';
import { Papel } from '../../common/enums/papel.enum';
import { UsuarioAutenticado } from '../../common/guards/jwt-auth.guard';

@Injectable()
export class SubstituicoesService {
  constructor(
    @InjectRepository(SubstituicaoUsuario)
    private readonly repo: Repository<SubstituicaoUsuario>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  async listar(usuario: UsuarioAutenticado) {
    const qb = this.repo
      .createQueryBuilder('s')
      .orderBy('s.dataInicio', 'DESC');

    if (usuario.papel !== Papel.ADMIN) {
      qb.where('s.usuarioSubstituidoId = :id OR s.usuarioSubstitutoId = :id', { id: usuario.id });
    }

    const registros = await qb.getMany();
    return Promise.all(registros.map((r) => this.mapComNomes(r)));
  }

  async criar(dto: CriarSubstituicaoDto, usuario: UsuarioAutenticado) {
    await this.validar(dto);
    const registro = await this.repo.save(
      this.repo.create({ ...dto, tiposAbrangidos: dto.tiposAbrangidos ?? [], criadoPorId: usuario.id }),
    );
    return this.mapComNomes(registro);
  }

  async atualizar(id: string, dto: CriarSubstituicaoDto) {
    const registro = await this.buscarOuFalhar(id);
    await this.validar(dto);
    Object.assign(registro, { ...dto, tiposAbrangidos: dto.tiposAbrangidos ?? [] });
    await this.repo.save(registro);
    return this.mapComNomes(registro);
  }

  /**
   * Encerra a substituição antecipadamente. Nunca apaga o registro — ele precisa
   * continuar disponível para eventuais provas/auditoria — apenas marca o momento
   * em que parou de valer.
   */
  async encerrar(id: string, usuario: UsuarioAutenticado): Promise<ReturnType<SubstituicoesService['mapComNomes']>> {
    const registro = await this.buscarOuFalhar(id);
    if (registro.encerradoEm) {
      throw new BadRequestException('Esta substituição já está encerrada.');
    }
    registro.encerradoEm = new Date();
    registro.encerradoPorId = usuario.id;
    await this.repo.save(registro);
    return this.mapComNomes(registro);
  }

  /** Usado pelo JwtStrategy: substituição vigente hoje (e não encerrada antecipadamente) em que o usuário logado é o substituto. */
  async buscarSubstituicaoAtivaComoSubstituto(usuarioSubstitutoId: string): Promise<SubstituicaoUsuario | null> {
    const hoje = new Date().toISOString().slice(0, 10);
    return this.repo
      .createQueryBuilder('s')
      .where('s.usuarioSubstitutoId = :id', { id: usuarioSubstitutoId })
      .andWhere('s.dataInicio <= :hoje', { hoje })
      .andWhere('s.dataFim >= :hoje', { hoje })
      .andWhere('s.encerradoEm IS NULL')
      .orderBy('s.criadoEm', 'DESC')
      .getOne();
  }

  private async validar(dto: CriarSubstituicaoDto): Promise<void> {
    if (dto.usuarioSubstituidoId === dto.usuarioSubstitutoId) {
      throw new BadRequestException('O substituto não pode ser o mesmo usuário substituído.');
    }
    if (dto.dataFim < dto.dataInicio) {
      throw new BadRequestException('A data fim não pode ser anterior à data início.');
    }
    const [substituido, substituto] = await Promise.all([
      this.usuarioRepo.findOne({ where: { id: dto.usuarioSubstituidoId } }),
      this.usuarioRepo.findOne({ where: { id: dto.usuarioSubstitutoId } }),
    ]);
    if (!substituido || !substituto) {
      throw new NotFoundException('Usuário substituído ou substituto não encontrado.');
    }
  }

  private async buscarOuFalhar(id: string): Promise<SubstituicaoUsuario> {
    const registro = await this.repo.findOne({ where: { id } });
    if (!registro) throw new NotFoundException('Substituição não encontrada.');
    return registro;
  }

  private async mapComNomes(registro: SubstituicaoUsuario) {
    const [substituido, substituto, encerradoPor] = await Promise.all([
      this.usuarioRepo.findOne({ where: { id: registro.usuarioSubstituidoId } }),
      this.usuarioRepo.findOne({ where: { id: registro.usuarioSubstitutoId } }),
      registro.encerradoPorId ? this.usuarioRepo.findOne({ where: { id: registro.encerradoPorId } }) : null,
    ]);
    const hoje = new Date().toISOString().slice(0, 10);
    const dentroDoPeriodo = registro.dataInicio <= hoje && registro.dataFim >= hoje;
    return {
      ...registro,
      usuarioSubstituidoNome: substituido?.nome,
      usuarioSubstitutoNome: substituto?.nome,
      encerradoPorNome: encerradoPor?.nome,
      vigente: dentroDoPeriodo && !registro.encerradoEm,
      encerradaAntecipadamente: !!registro.encerradoEm,
    };
  }
}

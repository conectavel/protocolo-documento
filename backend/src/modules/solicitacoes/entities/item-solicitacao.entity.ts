import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StatusItem, TipoItem, Turno } from '../../../common/enums/solicitacao.enum';
import { Solicitacao } from './solicitacao.entity';
import { AreaPrograma } from '../../parceiros/entities/area-programa.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Devolutiva } from '../../devolutivas/entities/devolutiva.entity';

/**
 * Um item dentro do ofício. Cada item tem tipo próprio (Ação/Atividade, Patrocínio,
 * Solicitação de Itens ou Convite) e pode ser roteado/atendido por uma área diferente
 * (regra HU08 — distribuição para múltiplas ações/programas).
 */
@Entity('itens_solicitacao')
export class ItemSolicitacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitacao_id' })
  solicitacaoId: string;

  @ManyToOne(() => Solicitacao, (solicitacao) => solicitacao.itens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column({ type: 'enum', enum: TipoItem })
  tipo: TipoItem;

  // Campos comuns a Patrocínio / Solicitação de Itens / Convite
  @Column({ nullable: true })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  resumo: string;

  // Campos específicos de Ação/Atividade
  @Column({ name: 'tipo_evento', nullable: true })
  tipoEvento: string;

  @Column({ name: 'acao_atividade', nullable: true })
  acaoAtividade: string;

  @Column({ nullable: true })
  disciplina: string;

  @Column({ type: 'enum', enum: Turno, nullable: true })
  turno: Turno;

  @Column({ name: 'data_inicio', type: 'date', nullable: true })
  dataInicio: string;

  @Column({ name: 'data_fim', type: 'date', nullable: true })
  dataFim: string;

  @Column({
    type: 'enum',
    enum: StatusItem,
    name: 'status_item',
    default: StatusItem.PENDENTE,
  })
  statusItem: StatusItem;

  @Column({ name: 'area_programa_id', nullable: true })
  areaProgramaId: string;

  @ManyToOne(() => AreaPrograma)
  @JoinColumn({ name: 'area_programa_id' })
  areaPrograma: AreaPrograma;

  @Column({ name: 'coordenador_responsavel_id', type: 'uuid', nullable: true })
  coordenadorResponsavelId: string | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'coordenador_responsavel_id' })
  coordenadorResponsavel: Usuario;

  @OneToOne(() => Devolutiva, (devolutiva) => devolutiva.item)
  devolutiva: Devolutiva;
}

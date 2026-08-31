import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ResultadoDevolutiva } from '../../../common/enums/solicitacao.enum';
import { ItemSolicitacao } from '../../solicitacoes/entities/item-solicitacao.entity';

/** Resposta final registrada pelo Coordenador da Ação/Programa para um item da solicitação. */
@Entity('devolutivas')
export class Devolutiva {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'item_solicitacao_id', unique: true })
  itemSolicitacaoId: string;

  @OneToOne(() => ItemSolicitacao, (item) => item.devolutiva, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_solicitacao_id' })
  item: ItemSolicitacao;

  @Column({ type: 'enum', enum: ResultadoDevolutiva })
  resultado: ResultadoDevolutiva;

  @Column({ type: 'text', nullable: true })
  justificativa: string;

  @Column({ name: 'data_evento', type: 'date', nullable: true })
  dataEvento: string;

  @Column({ nullable: true })
  horario: string;

  @Column({ nullable: true })
  local: string;

  @Column({ name: 'numero_evento_turma', nullable: true })
  numeroEventoTurma: string;

  @Column({ name: 'numero_processo_aceite_fluig', nullable: true })
  numeroProcessoAceiteFluig: string;

  @Column({ name: 'registrado_por_id', nullable: true })
  registradoPorId: string;

  @Column({ name: 'registrado_por_nome', nullable: true })
  registradoPorNome: string;

  @CreateDateColumn({ name: 'registrado_em', type: 'timestamptz' })
  registradoEm: Date;
}

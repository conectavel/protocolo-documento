import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AcaoTramitacao } from '../../../common/enums/solicitacao.enum';
import { Solicitacao } from './solicitacao.entity';
import { ItemSolicitacao } from './item-solicitacao.entity';

/**
 * Histórico imutável (append-only) de toda transição de estado da solicitação ou de um item.
 * Nunca é atualizado ou removido — é a base da rastreabilidade exigida (requirements.md §9).
 */
@Entity('tramitacoes')
export class Tramitacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitacao_id' })
  solicitacaoId: string;

  @ManyToOne(() => Solicitacao, (solicitacao) => solicitacao.tramitacoes)
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column({ name: 'item_solicitacao_id', nullable: true })
  itemSolicitacaoId: string;

  @ManyToOne(() => ItemSolicitacao)
  @JoinColumn({ name: 'item_solicitacao_id' })
  itemSolicitacao: ItemSolicitacao;

  @Column({ name: 'de_etapa', nullable: true })
  deEtapa: string;

  @Column({ name: 'para_etapa' })
  paraEtapa: string;

  @Column({ type: 'enum', enum: AcaoTramitacao })
  acao: AcaoTramitacao;

  @Column({ type: 'text', nullable: true })
  motivo: string;

  @Column({ name: 'usuario_id', nullable: true })
  usuarioId: string;

  @Column({ name: 'usuario_nome', nullable: true })
  usuarioNome: string;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  criadoEm: Date;
}

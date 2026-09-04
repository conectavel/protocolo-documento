import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Parceiro } from './parceiro.entity';

/**
 * Espelho local do Mobilizador. Fonte oficial: RM/ACORP.
 * Regra de negócio (confirmada pelo cliente): 1 Mobilizador pertence a exatamente 1 Parceiro
 * (e, por consequência, ao Coordenador Regional desse Parceiro) — mas um Parceiro
 * normalmente tem MAIS DE UM Mobilizador (ver Parceiro.mobilizadores).
 */
@Entity('mobilizadores')
export class Mobilizador {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rm_codigo', unique: true })
  rmCodigo: string;

  @Column()
  nome: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ name: 'parceiro_id', nullable: true })
  parceiroId: string;

  @ManyToOne(() => Parceiro, (parceiro) => parceiro.mobilizadores)
  @JoinColumn({ name: 'parceiro_id' })
  parceiro: Parceiro;

  @Column({ name: 'ultima_sincronizacao_rm', type: 'timestamptz', nullable: true })
  ultimaSincronizacaoRm: Date;
}

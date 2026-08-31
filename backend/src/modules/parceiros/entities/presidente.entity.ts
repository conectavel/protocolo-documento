import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Espelho local do Presidente institucional do Parceiro. Fonte oficial: RM/ACORP. */
@Entity('presidentes')
export class Presidente {
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

  @Column({ name: 'ultima_sincronizacao_rm', type: 'timestamptz', nullable: true })
  ultimaSincronizacaoRm: Date;
}

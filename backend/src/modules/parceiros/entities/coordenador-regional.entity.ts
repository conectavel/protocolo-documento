import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Parceiro } from './parceiro.entity';

/**
 * Espelho local do Coordenador Regional. Fonte oficial: RM/ACORP.
 * Escrita permitida apenas pelo módulo rm-integration (sincronização) — nunca via UI.
 */
@Entity('coordenadores_regionais')
export class CoordenadorRegional {
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

  @OneToMany(() => Parceiro, (parceiro) => parceiro.coordenadorRegional)
  parceiros: Parceiro[];
}

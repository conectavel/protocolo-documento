import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CoordenadorRegional } from './coordenador-regional.entity';
import { Presidente } from './presidente.entity';
import { Mobilizador } from './mobilizador.entity';

/**
 * Espelho local do Parceiro (ex.: FAEG). Fonte oficial: RM/ACORP, sincronizado via RM Middleware.
 *
 * Hierarquia de negócio (confirmada pelo cliente, não editável nesta aplicação):
 * - 1 Coordenador Regional atende N Parceiros.
 * - 1 Parceiro pertence a exatamente 1 Coordenador Regional, tem exatamente 1 Mobilizador
 *   e exatamente 1 Presidente vigente.
 */
@Entity('parceiros')
export class Parceiro {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rm_codigo', unique: true })
  rmCodigo: string;

  @Column()
  sigla: string;

  @Column({ name: 'razao_social' })
  razaoSocial: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ name: 'coordenador_regional_id' })
  coordenadorRegionalId: string;

  @ManyToOne(() => CoordenadorRegional, (coordenador) => coordenador.parceiros)
  @JoinColumn({ name: 'coordenador_regional_id' })
  coordenadorRegional: CoordenadorRegional;

  @Column({ name: 'presidente_id' })
  presidenteId: string;

  @OneToOne(() => Presidente)
  @JoinColumn({ name: 'presidente_id' })
  presidente: Presidente;

  @Column({ name: 'mobilizador_id', nullable: true })
  mobilizadorId: string;

  @OneToOne(() => Mobilizador, (mobilizador) => mobilizador.parceiro)
  @JoinColumn({ name: 'mobilizador_id' })
  mobilizador: Mobilizador;

  @Column({ name: 'ultima_sincronizacao_rm', type: 'timestamptz', nullable: true })
  ultimaSincronizacaoRm: Date;
}

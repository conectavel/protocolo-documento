import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Papel } from '../../../common/enums/papel.enum';
import { AreaPrograma } from '../../parceiros/entities/area-programa.entity';

/**
 * Usuário interno (Assessor, Superintendente, Diretor Educacional, Gestor, Coordenador, Admin).
 * Mobilizador e Coordenador Regional NÃO são usuários internos — são vínculos com as entidades
 * sincronizadas do RM (ver `parceiros/entities`); o login desses papéis referencia o rm_codigo
 * do Mobilizador/Coordenador Regional correspondente (campo `rmCodigoReferencia`).
 */
@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'senha_hash', select: false })
  senhaHash: string;

  @Column({ type: 'enum', enum: Papel })
  papel: Papel;

  @Column({ name: 'area_programa_id', nullable: true })
  areaProgramaId: string;

  @ManyToOne(() => AreaPrograma, (area) => area.coordenadores)
  @JoinColumn({ name: 'area_programa_id' })
  areaPrograma: AreaPrograma;

  /** Preenchido quando papel = MOBILIZADOR ou COORDENADOR_REGIONAL: rm_codigo do vínculo no RM. */
  @Column({ name: 'rm_codigo_referencia', nullable: true })
  rmCodigoReferencia: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ name: 'criado_em', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  criadoEm: Date;
}

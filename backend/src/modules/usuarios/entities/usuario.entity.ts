import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Papel } from '../../../common/enums/papel.enum';
import { AreaPrograma } from '../../parceiros/entities/area-programa.entity';

/**
 * Usuário interno (Assessor, Superintendente, Diretor Educacional, Gestor, Coordenador, Admin).
 * Mobilizador, Presidente do Sindicato e Coordenador Regional NÃO são usuários internos — são
 * vínculos com as entidades sincronizadas do RM (ver `parceiros/entities`); o login desses
 * papéis referencia o rm_codigo do Mobilizador/Presidente/Coordenador Regional correspondente
 * (campo `rmCodigoReferencia`). Presidente tem a mesma autonomia do Mobilizador (ver
 * PAPEIS_PARCEIRO em common/enums/papel.enum.ts).
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

  /** Área/Programa "principal" — usada por Gestor (a área que ele gerencia) e como fallback de leitura para Coordenador. */
  @Column({ name: 'area_programa_id', nullable: true })
  areaProgramaId: string;

  @ManyToOne(() => AreaPrograma, (area) => area.coordenadores)
  @JoinColumn({ name: 'area_programa_id' })
  areaPrograma: AreaPrograma;

  /**
   * Todas as Áreas/Programa que este usuário pode atender — um Coordenador pode
   * atuar em mais de uma (ex.: FPR e ATeG ao mesmo tempo), diferente do antigo
   * modelo de uma única área. O Administrador gerencia isso em "Gerenciar
   * Usuários"; onde estiver vazio, o RBAC cai de volta em `areaProgramaId`
   * (compatibilidade com usuários já existentes).
   */
  @Column({ name: 'areas_programa_ids', type: 'jsonb', default: () => "'[]'" })
  areasProgramaIds: string[];

  /** "Pasta"/Departamento sob responsabilidade de um Diretor Educacional — hoje só informativo (exibido em Gerenciar Usuários). */
  @Column({ name: 'departamento', type: 'varchar', nullable: true })
  departamento: string | null;

  /** Preenchido quando papel = MOBILIZADOR ou COORDENADOR_REGIONAL: rm_codigo do vínculo no RM. */
  @Column({ name: 'rm_codigo_referencia', nullable: true })
  rmCodigoReferencia: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ name: 'criado_em', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  criadoEm: Date;
}

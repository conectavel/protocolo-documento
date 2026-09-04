import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CoordenadorRegional } from './coordenador-regional.entity';
import { Presidente } from './presidente.entity';
import { Mobilizador } from './mobilizador.entity';

/**
 * Espelho local do Parceiro — o Sindicato Rural (um por município), que é
 * "parceiro" no sentido de manter parceria institucional com o SENAR-GO.
 * Fonte oficial: RM/ACORP, sincronizado via RM Middleware.
 *
 * Hierarquia de negócio (confirmada pelo cliente, não editável nesta aplicação):
 * - 1 Coordenador Regional atende N Parceiros.
 * - 1 Parceiro pertence a exatamente 1 Coordenador Regional, tem exatamente 1
 *   Presidente vigente e 1 OU MAIS Mobilizadores (um sindicato normalmente
 *   tem mais de um mobilizador).
 * - 1 Mobilizador pertence a exatamente 1 Parceiro.
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

  // Usados no cabeçalho/rodapé do PDF de ofício gerado automaticamente (ver
  // GeradorOficioService) — cada Parceiro/Sindicato tem as suas próprias
  // informações institucionais, vindas do RM como o restante do cadastro.
  @Column({ nullable: true })
  cnpj: string;

  @Column({ nullable: true })
  endereco: string;

  @Column({ nullable: true })
  telefone: string;

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

  @OneToMany(() => Mobilizador, (mobilizador) => mobilizador.parceiro)
  mobilizadores: Mobilizador[];

  @Column({ name: 'ultima_sincronizacao_rm', type: 'timestamptz', nullable: true })
  ultimaSincronizacaoRm: Date;
}

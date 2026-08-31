import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type EntidadeRm = 'PARCEIRO' | 'PRESIDENTE' | 'MOBILIZADOR' | 'COORDENADOR_REGIONAL';

/** Log de auditoria de cada sincronização (webhook ou job periódico) com o RM Middleware. */
@Entity('sincronizacoes_rm')
export class SincronizacaoRm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entidade: EntidadeRm;

  @Column({ name: 'entidade_id', nullable: true })
  entidadeId: string;

  @Column({ name: 'rm_codigo' })
  rmCodigo: string;

  @Column({ name: 'sincronizado_em', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  sincronizadoEm: Date;

  @Column({ default: 'OK' })
  status: 'OK' | 'ERRO';

  @Column({ name: 'detalhe_erro', nullable: true, type: 'text' })
  detalheErro: string;

  @Column({ default: 'WEBHOOK' })
  origem: 'WEBHOOK' | 'JOB_PERIODICO';
}

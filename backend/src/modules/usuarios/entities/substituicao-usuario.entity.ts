import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Substituição temporária de usuário (equivalente ao "Substitutos" do Fluig):
 * enquanto o período estiver vigente, o substituto assume o papel/escopo do
 * substituído para fins de tramitação (ver JwtStrategy.validate).
 */
@Entity('substituicoes_usuario')
export class SubstituicaoUsuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_substituido_id' })
  usuarioSubstituidoId: string;

  @Column({ name: 'usuario_substituto_id' })
  usuarioSubstitutoId: string;

  @Column({ name: 'data_inicio', type: 'date' })
  dataInicio: string;

  @Column({ name: 'data_fim', type: 'date' })
  dataFim: string;

  /** true = todos os processos/tramitações do substituído; false = apenas os tipos em `tiposAbrangidos`. */
  @Column({ name: 'substituir_todos_processos', default: true })
  substituirTodosProcessos: boolean;

  /** Códigos de ação livres (ex.: 'CIENCIA', 'ANALISE_ASSESSORIA') quando substituirTodosProcessos = false. */
  @Column({ name: 'tipos_abrangidos', type: 'jsonb', default: () => "'[]'" })
  tiposAbrangidos: string[];

  @Column({ type: 'text', nullable: true })
  justificativa: string;

  @Column({ name: 'criado_por_id', nullable: true })
  criadoPorId: string;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  criadoEm: Date;
}

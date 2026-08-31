import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StatusMacro } from '../../../common/enums/solicitacao.enum';
import { Parceiro } from '../../parceiros/entities/parceiro.entity';
import { Mobilizador } from '../../parceiros/entities/mobilizador.entity';
import { ItemSolicitacao } from './item-solicitacao.entity';
import { Tramitacao } from './tramitacao.entity';

/**
 * Agregado raiz do domínio: o "Ofício" protocolado pelo Mobilizador.
 * `parceiroId`/`mobilizadorId`/`presidenteId` (via parceiro) são referências (FK) às tabelas
 * espelho sincronizadas do RM — nunca cópias de dados, para que atualizações do ACORP
 * apareçam automaticamente em qualquer etapa da tramitação.
 */
@Entity('solicitacoes')
export class Solicitacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'numero_documento' })
  numeroDocumento: string; // ex.: 0010/2025

  @Column({ name: 'numero_processo', nullable: true })
  numeroProcesso: string; // ex.: 980638

  @Column({ name: 'id_documento', nullable: true })
  idDocumento: string;

  @Column({ name: 'parceiro_id' })
  parceiroId: string;

  @ManyToOne(() => Parceiro)
  @JoinColumn({ name: 'parceiro_id' })
  parceiro: Parceiro;

  @Column({ name: 'mobilizador_id' })
  mobilizadorId: string;

  @ManyToOne(() => Mobilizador)
  @JoinColumn({ name: 'mobilizador_id' })
  mobilizador: Mobilizador;

  @Column({ nullable: true })
  municipio: string;

  @Column()
  assunto: string;

  @Column({ type: 'text', nullable: true })
  observacao: string;

  @Column({ name: 'data_documento', type: 'date' })
  dataDocumento: string;

  @Column({ name: 'anexo_oficio_id' })
  anexoOficioId: string;

  @Column({
    type: 'enum',
    enum: StatusMacro,
    name: 'status_macro',
    default: StatusMacro.EM_ANALISE_REGIONAL,
  })
  statusMacro: StatusMacro;

  /** Rótulo textual da etapa/área corrente. Só é exposto a papéis internos (ver SolicitacoesService). */
  @Column({ name: 'etapa_atual', default: 'Análise do Regional' })
  etapaAtual: string;

  @Column({ name: 'data_solicitacao', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  dataSolicitacao: Date;

  @Column({ name: 'prazo_ciencia_regional', type: 'timestamptz' })
  prazoCienciaRegional: Date;

  @Column({ name: 'data_ciencia_regional', type: 'timestamptz', nullable: true })
  dataCienciaRegional: Date | null;

  @Column({ name: 'ciencia_automatica', default: false })
  cienciaAutomatica: boolean;

  @Column({ name: 'area_programa_id', nullable: true })
  areaProgramaId: string;

  @Column({ name: 'coordenador_designado_id', type: 'uuid', nullable: true })
  coordenadorDesignadoId: string | null;

  @Column({ name: 'motivo_devolucao_ou_recusa', type: 'text', nullable: true })
  motivoDevolucaoOuRecusa: string | null;

  @OneToMany(() => ItemSolicitacao, (item) => item.solicitacao, { cascade: true })
  itens: ItemSolicitacao[];

  @OneToMany(() => Tramitacao, (tramitacao) => tramitacao.solicitacao)
  tramitacoes: Tramitacao[];

  @Column({ name: 'criado_por', nullable: true })
  criadoPor: string;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  criadoEm: Date;

  @Column({ name: 'alterado_por', nullable: true })
  alteradoPor: string;

  @UpdateDateColumn({ name: 'alterado_em', type: 'timestamptz' })
  alteradoEm: Date;
}

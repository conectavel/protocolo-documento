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

  /**
   * Identificador único e destacado de todo protocolo, gerado pelo próprio sistema
   * (formato AAAAMMDD + sequência do dia, ex.: 20260902001) — não confundir com
   * `numeroDocumento`, o número do ofício em si, que o Mobilizador pode informar.
   */
  @Column({ name: 'numero_processo', nullable: true })
  numeroProcesso: string;

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

  /**
   * Diretores explicitamente escolhidos pelo Superintendente no despacho (HU04) —
   * só esses usuários podem direcionar os itens desta solicitação para uma
   * Área/Programa (HU05). Cada item pode ir para uma Área diferente, então não
   * existe mais um único "diretor da solicitação"; a designação vive aqui, no
   * agregado raiz, e o roteamento em si vive por item (ver ItemSolicitacao).
   */
  @Column({ name: 'diretores_designados_ids', type: 'jsonb', default: () => "'[]'" })
  diretoresDesignadosIds: string[];

  @Column({ name: 'motivo_devolucao_ou_recusa', type: 'text', nullable: true })
  motivoDevolucaoOuRecusa: string | null;

  /**
   * Presente quando este protocolo se originou de um e-mail recebido em
   * superintendencia@senar-go.com.br (ver módulo `pre-protocolos`) em vez de ter
   * sido protocolado diretamente pelo Mobilizador/Presidente — usado para exibir
   * o selo "Oriundo de E-mail" nas telas de Protocolo.
   */
  @Column({ name: 'pre_protocolo_origem_id', type: 'uuid', nullable: true })
  preProtocoloOrigemId: string | null;

  /** E-mail de quem enviou o ofício original, para possível resposta/notificação (só quando veio de e-mail). */
  @Column({ name: 'email_remetente_origem', type: 'varchar', nullable: true })
  emailRemetenteOrigem: string | null;

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

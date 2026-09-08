import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type StatusPreProtocolo = 'PENDENTE' | 'CONVERTIDO' | 'DESCARTADO';
export type SolicitanteTipo = 'MOBILIZADOR' | 'PRESIDENTE';
export type OrigemPreProtocolo = 'EMAIL' | 'FORMULARIO_PUBLICO';

/**
 * Solicitação recebida por e-mail (ex.: superintendencia@senar-go.com.br) antes de virar
 * um Protocolo de Ofício formal. Um conector externo (IMAP ou Microsoft Graph — a definir
 * com o time de TI, ver integracao-rm-fluig.md) chama `POST /pre-protocolos/ingestao` a
 * cada e-mail novo; o Assessor revisa e confirma os dados (Parceiro, Mobilizador, itens)
 * antes de gerar o Protocolo de Ofício de verdade.
 */
@Entity('pre_protocolos')
export class PreProtocolo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  remetente: string;

  @Column()
  assunto: string;

  @Column({ type: 'text', nullable: true })
  corpo: string;

  @Column({ name: 'anexo_oficio_id', nullable: true })
  anexoOficioId: string;

  /**
   * Dados de contato de quem preencheu o formulário público (origem = FORMULARIO_PUBLICO;
   * nulos na ingestão por e-mail). O CPF permite reconhecer a mesma pessoa numa próxima
   * solicitação e pré-preencher o formulário a partir do último envio dela (ver
   * `PreProtocolosService.buscarDadosPorCpf`) — se não encontrar, a pessoa preenche
   * manualmente e segue normalmente.
   */
  @Column({ name: 'cpf', type: 'varchar', nullable: true })
  cpf: string | null;

  @Column({ name: 'data_nascimento', type: 'date', nullable: true })
  dataNascimento: string | null;

  @Column({ name: 'telefone', type: 'varchar', nullable: true })
  telefone: string | null;

  @Column({ name: 'telefone_whatsapp', default: false })
  telefoneWhatsapp: boolean;

  /** De onde este registro chegou — conector de e-mail ou formulário público de envio anônimo. */
  @Column({ name: 'origem', type: 'varchar', default: 'EMAIL' })
  origem: OrigemPreProtocolo;

  /**
   * Quando o e-mail não veio com o ofício em PDF, o Assessor anexa manualmente
   * e precisa registrar quem está solicitando (o e-mail sozinho não deixa isso
   * claro) — puramente informativo, para orientar a conversão em Protocolo.
   */
  @Column({ name: 'solicitante_tipo', type: 'varchar', nullable: true })
  solicitanteTipo: SolicitanteTipo | null;

  @Column({ default: 'PENDENTE' })
  status: StatusPreProtocolo;

  @Column({ name: 'solicitacao_gerada_id', nullable: true })
  solicitacaoGeradaId: string;

  @Column({ name: 'convertido_por_id', nullable: true })
  convertidoPorId: string;

  @Column({ name: 'convertido_em', type: 'timestamptz', nullable: true })
  convertidoEm: Date;

  @Column({ name: 'motivo_descarte', type: 'text', nullable: true })
  motivoDescarte: string | null;

  @CreateDateColumn({ name: 'recebido_em', type: 'timestamptz' })
  recebidoEm: Date;
}

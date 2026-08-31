import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type StatusPreProtocolo = 'PENDENTE' | 'CONVERTIDO' | 'DESCARTADO';

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

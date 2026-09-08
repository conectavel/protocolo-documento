import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TipoAssinatura = 'ELETRONICA_SIMPLES' | 'CERTIFICADO_SIMULADO';

/**
 * Assinatura digital anexada a uma Tramitação — hoje só usada nas decisões de
 * "Análise da Assessoria" (aprovar/devolver/recusar) e "Despacho da
 * Superintendência" (ver requisito do cliente). Duas modalidades:
 *
 *  - ELETRONICA_SIMPLES: assinatura desenhada na tela (traço capturado como
 *    imagem), sem certificado — assinatura eletrônica simples.
 *  - CERTIFICADO_SIMULADO: fluxo de "usar certificado digital (.pfx/.p12)" —
 *    **simulado por enquanto**: não há validação criptográfica real nem
 *    integração com um provedor ICP-Brasil (Certisign, BirdID, gov.br etc.).
 *    É só a experiência de tela, deixada pronta para quando esse provedor for
 *    escolhido. Nunca persiste o arquivo do certificado em si — só o nome do
 *    arquivo e o titular declarado — para não guardar chave privada por engano.
 */
@Entity('assinaturas_digitais')
export class AssinaturaDigital {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tramitacao_id' })
  tramitacaoId: string;

  @Column({ name: 'usuario_id' })
  usuarioId: string;

  @Column({ name: 'usuario_nome' })
  usuarioNome: string;

  @Column({ type: 'varchar' })
  tipo: TipoAssinatura;

  /** Data URL (PNG base64) do traço desenhado — só para ELETRONICA_SIMPLES. */
  @Column({ name: 'imagem_assinatura', type: 'text', nullable: true })
  imagemAssinatura: string | null;

  @Column({ name: 'certificado_nome_arquivo', type: 'varchar', nullable: true })
  certificadoNomeArquivo: string | null;

  @Column({ name: 'titular_certificado', type: 'varchar', nullable: true })
  titularCertificado: string | null;

  /** Sempre `false` hoje — reservado para quando houver validação real de certificado. */
  @Column({ default: false })
  validada: boolean;

  @Column({ name: 'aviso_validade', type: 'text', nullable: true })
  avisoValidade: string | null;

  @CreateDateColumn({ name: 'assinado_em', type: 'timestamptz' })
  assinadoEm: Date;
}

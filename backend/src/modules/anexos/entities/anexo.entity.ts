import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TipoAnexo = 'OFICIO' | 'DEVOLUTIVA' | 'OUTRO';

@Entity('anexos')
export class Anexo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitacao_id', nullable: true })
  solicitacaoId: string;

  @Column({ default: 'OUTRO' })
  tipo: TipoAnexo;

  @Column({ name: 'nome_arquivo' })
  nomeArquivo: string;

  @Column({ name: 'caminho_storage' })
  caminhoStorage: string;

  @Column({ name: 'tamanho_bytes' })
  tamanhoBytes: number;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'enviado_por', nullable: true })
  enviadoPor: string;

  @Column({ name: 'enviado_em', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  enviadoEm: Date;
}

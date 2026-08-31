import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class AnexoIngestaoDto {
  @IsNotEmpty() @IsString() nomeArquivo: string;
  @IsNotEmpty() @IsString() mimeType: string;
  /** Conteúdo do arquivo em base64 (o conector de e-mail decodifica o MIME e envia assim). */
  @IsNotEmpty() @IsString() conteudoBase64: string;
}

/**
 * Payload que o conector de e-mail (IMAP/Microsoft Graph) envia a cada mensagem nova
 * recebida em superintendencia@senar-go.com.br — ver integracao-rm-fluig.md.
 */
export class IngerirPreProtocoloDto {
  @IsNotEmpty() @IsString() remetente: string;
  @IsNotEmpty() @IsString() assunto: string;
  @IsOptional() @IsString() corpo?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnexoIngestaoDto)
  anexos?: AnexoIngestaoDto[];
}

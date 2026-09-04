import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CriarItemSolicitacaoDto } from '../../solicitacoes/dto/criar-solicitacao.dto';

/**
 * Dados para gerar automaticamente um PDF de ofício padrão a partir do que o
 * usuário já preencheu na tela (Dados do Documento + Itens) — usado quando o
 * Parceiro/Sindicato não tem um PDF próprio pronto para anexar. O texto é
 * montado a partir da identificação do Parceiro/Presidente/Mobilizador já
 * resolvida no frontend (ver ParceirosService/JwtStrategy), então este DTO
 * não precisa (nem deve) confiar em nada que o cliente não possa realmente
 * ter preenchido — apenas texto livre para o corpo do documento.
 */
export class GerarOficioModeloDto {
  @IsOptional() @IsString() parceiroSigla?: string;
  @IsOptional() @IsString() presidenteNome?: string;
  @IsOptional() @IsString() mobilizadorNome?: string;
  @IsOptional() @IsString() coordenadorRegionalNome?: string;
  @IsOptional() @IsString() cnpj?: string;
  @IsOptional() @IsString() endereco?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsString() municipio?: string;

  @IsNotEmpty() @IsString() assunto: string;
  @IsOptional() @IsString() numeroDocumento?: string;
  @IsOptional() @IsISO8601() dataDocumento?: string;
  @IsOptional() @IsString() resumoObservacoes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CriarItemSolicitacaoDto)
  itens: CriarItemSolicitacaoDto[];
}

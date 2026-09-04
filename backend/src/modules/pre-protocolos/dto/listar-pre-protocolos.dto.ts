import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * Filtros do painel de Pré Protocolo — duas abas no frontend (Entrada por E-mail:
 * PENDENTE/DESCARTADO; Protocolos Iniciados: CONVERTIDO), cada uma com busca por
 * remetente/assunto, período de recebimento e paginação (ver PreProtocolosService.listar).
 */
export class ListarPreProtocolosDto {
  @IsOptional() @IsIn(['PENDENTE', 'CONVERTIDO', 'DESCARTADO']) status?: 'PENDENTE' | 'CONVERTIDO' | 'DESCARTADO';
  @IsOptional() @IsString() remetente?: string;
  @IsOptional() @IsString() assunto?: string;
  @IsOptional() @IsString() dataInicio?: string;
  @IsOptional() @IsString() dataFim?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() pageSize?: string;
}

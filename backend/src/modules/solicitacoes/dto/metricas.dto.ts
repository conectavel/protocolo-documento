import { IsOptional, IsString } from 'class-validator';

export class MetricasSolicitacoesDto {
  @IsOptional() @IsString() dataInicio?: string;
  @IsOptional() @IsString() dataFim?: string;
  @IsOptional() @IsString() parceiroId?: string;
  @IsOptional() @IsString() regionalId?: string;
  @IsOptional() @IsString() mobilizadorId?: string;
  @IsOptional() @IsString() tipoSolicitacao?: string;
}

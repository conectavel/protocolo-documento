import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusMacro } from '../../../common/enums/solicitacao.enum';

export class ListarSolicitacoesDto {
  @IsOptional() @IsEnum(StatusMacro) status?: StatusMacro;
  @IsOptional() @IsString() parceiroId?: string;
  @IsOptional() @IsString() regionalId?: string;
  @IsOptional() @IsString() tipoSolicitacao?: string;
  @IsOptional() @IsString() acaoAtividade?: string;
  @IsOptional() @IsString() disciplina?: string;
  @IsOptional() @IsString() numeroDocumento?: string;
  @IsOptional() @IsString() dataInicio?: string;
  @IsOptional() @IsString() dataFim?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() pageSize?: string;
}

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusMacro, Urgencia } from '../../../common/enums/solicitacao.enum';

export class ListarSolicitacoesDto {
  @IsOptional() @IsEnum(StatusMacro) status?: StatusMacro;
  @IsOptional() @IsEnum(Urgencia) urgencia?: Urgencia;
  @IsOptional() @IsString() parceiroId?: string;
  @IsOptional() @IsString() regionalId?: string;
  @IsOptional() @IsString() tipoSolicitacao?: string;
  @IsOptional() @IsString() acaoAtividade?: string;
  @IsOptional() @IsString() disciplina?: string;
  @IsOptional() @IsString() numeroDocumento?: string;
  /** Nº de Processo — identificador gerado pelo sistema (ex.: 20260902001), exibido com o ícone "#". */
  @IsOptional() @IsString() numeroProcesso?: string;
  @IsOptional() @IsString() dataInicio?: string;
  @IsOptional() @IsString() dataFim?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() pageSize?: string;
}

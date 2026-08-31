import { IsArray, IsBoolean, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CriarSubstituicaoDto {
  @IsUUID() usuarioSubstituidoId: string;
  @IsUUID() usuarioSubstitutoId: string;
  @IsDateString() dataInicio: string;
  @IsDateString() dataFim: string;
  @IsBoolean() substituirTodosProcessos: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) tiposAbrangidos?: string[];
  @IsOptional() @IsString() justificativa?: string;
}

export class AtualizarSubstituicaoDto extends CriarSubstituicaoDto {}

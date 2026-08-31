import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { ResultadoDevolutiva } from '../../../common/enums/solicitacao.enum';

export class AnaliseAssessoriaDto {
  @IsIn(['APROVAR', 'DEVOLVER_AJUSTE', 'RECUSAR'])
  decisao: 'APROVAR' | 'DEVOLVER_AJUSTE' | 'RECUSAR';

  @ValidateIf((dto) => dto.decisao !== 'APROVAR')
  @IsNotEmpty({ message: 'Motivo é obrigatório para devolução ou recusa.' })
  @IsString()
  motivo?: string;
}

export class DespachoSuperintendenteDto {
  @IsIn(['EDUCACIONAL'])
  diretoriaDestino: 'EDUCACIONAL';
}

export class DirecionamentoDiretorDto {
  @IsUUID() areaProgramaId: string;

  @IsOptional() @IsUUID() coordenadorId?: string; // omitido = delega ao Gestor (HU05)
}

export class DesignarCoordenadorDto {
  @IsUUID() coordenadorId: string;
}

export class EncaminharItemDto {
  @IsUUID() areaProgramaId: string;
  @IsNotEmpty() @IsString() motivo: string;
}

export class RegistrarDevolutivaDto {
  @IsEnum(ResultadoDevolutiva) resultado: ResultadoDevolutiva;

  @ValidateIf((dto) => dto.resultado !== ResultadoDevolutiva.ATENDIDO)
  @IsNotEmpty({ message: 'Justificativa é obrigatória quando o item não é totalmente atendido.' })
  @IsString()
  justificativa?: string;

  @IsOptional() @IsString() dataEvento?: string;
  @IsOptional() @IsString() horario?: string;
  @IsOptional() @IsString() local?: string;
  @IsOptional() @IsString() numeroEventoTurma?: string;
  @IsOptional() @IsString() numeroProcessoAceiteFluig?: string;
}

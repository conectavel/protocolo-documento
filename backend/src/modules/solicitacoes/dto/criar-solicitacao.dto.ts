import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { TipoItem, Turno } from '../../../common/enums/solicitacao.enum';

export class CriarItemSolicitacaoDto {
  @IsEnum(TipoItem)
  tipo: TipoItem;

  // Ação/Atividade
  @IsOptional() @IsString() tipoEvento?: string;
  @IsOptional() @IsString() acaoAtividade?: string;
  @IsOptional() @IsString() disciplina?: string;
  @IsOptional() @IsEnum(Turno) turno?: Turno;

  // Patrocínio / Solicitação de Itens / Convite
  @IsOptional() @IsString() titulo?: string;
  @IsOptional() @IsString() resumo?: string;

  @IsOptional() @IsISO8601() dataInicio?: string;
  @IsOptional() @IsISO8601() dataFim?: string;

  // Solicitação de Itens
  @IsOptional() @IsInt() @Min(1) quantidade?: number;

  // Convite
  @IsOptional() @IsString() hora?: string;
  @IsOptional() @IsString() local?: string;
  @IsOptional() @IsString() responsavel?: string;
  @IsOptional() @IsString() telefone?: string;
}

export class CriarSolicitacaoDto {
  @IsUUID() parceiroId: string;
  @IsUUID() mobilizadorId: string;
  @IsOptional() @IsString() municipio?: string;

  @IsNotEmpty() @IsString() assunto: string;
  @IsOptional() @IsString() numeroDocumento?: string;
  @IsISO8601() dataDocumento: string;
  @IsOptional() @IsString() resumoObservacoes?: string;

  @IsUUID() anexoOficioId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CriarItemSolicitacaoDto)
  itens: CriarItemSolicitacaoDto[];
}

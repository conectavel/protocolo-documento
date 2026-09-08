import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ResultadoDevolutiva, Turno } from '../../../common/enums/solicitacao.enum';

/**
 * Um item que a Assessoria/Superintendência resolveu diretamente, sem seguir o
 * restante do fluxo (Diretor/Gestor/Coordenador) — o caso mais comum é excluir
 * (`resultado` omitido, vira NAO_ATENDIDO), mas um Convite pode ser marcado
 * como atendido diretamente pela Assessoria (ver HU03 — Convite é exclusivo dela).
 */
export class ItemExcluidoDto {
  @IsUUID() itemId: string;
  @IsOptional() @IsString() observacao?: string;
  @IsOptional() @IsEnum(ResultadoDevolutiva) resultado?: ResultadoDevolutiva;
}

/**
 * Assinatura digital opcional anexada a uma decisão (Análise da Assessoria ou
 * Despacho da Superintendência). `CERTIFICADO_SIMULADO` ainda não tem validação
 * criptográfica real (ver AssinaturaDigital entity) — é só a experiência de
 * tela, aguardando a escolha de um provedor ICP-Brasil de verdade.
 */
export class AssinaturaDto {
  @IsIn(['ELETRONICA_SIMPLES', 'CERTIFICADO_SIMULADO'])
  tipo: 'ELETRONICA_SIMPLES' | 'CERTIFICADO_SIMULADO';

  @ValidateIf((dto) => dto.tipo === 'ELETRONICA_SIMPLES')
  @IsNotEmpty({ message: 'Desenhe a assinatura antes de confirmar.' })
  @IsString()
  imagemAssinaturaBase64?: string;

  @ValidateIf((dto) => dto.tipo === 'CERTIFICADO_SIMULADO')
  @IsNotEmpty({ message: 'Informe o nome do arquivo do certificado.' })
  @IsString()
  certificadoNomeArquivo?: string;

  @ValidateIf((dto) => dto.tipo === 'CERTIFICADO_SIMULADO')
  @IsNotEmpty({ message: 'Informe o nome do titular do certificado.' })
  @IsString()
  titularCertificado?: string;
}

export class AnaliseAssessoriaDto {
  @IsIn(['APROVAR', 'DEVOLVER_AJUSTE', 'RECUSAR'])
  decisao: 'APROVAR' | 'DEVOLVER_AJUSTE' | 'RECUSAR';

  @ValidateIf((dto) => dto.decisao !== 'APROVAR')
  @IsNotEmpty({ message: 'Motivo é obrigatório para devolução ou recusa.' })
  @IsString()
  motivo?: string;

  /** Itens que a Assessoria decidiu não incluir no fluxo (ficam "Parcialmente Atendido" automaticamente). */
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ItemExcluidoDto) itensExcluidos?: ItemExcluidoDto[];

  @IsOptional() @ValidateNested() @Type(() => AssinaturaDto) assinatura?: AssinaturaDto;
}

export class DespachoSuperintendenteDto {
  @IsIn(['EDUCACIONAL'])
  diretoriaDestino: 'EDUCACIONAL';

  @IsArray()
  @ArrayNotEmpty({ message: 'Selecione ao menos um Diretor responsável.' })
  @IsUUID('4', { each: true })
  diretoresIds: string[];

  /** Itens que o Superintendente decidiu não incluir no fluxo (ficam "Parcialmente Atendido" automaticamente). */
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ItemExcluidoDto) itensExcluidos?: ItemExcluidoDto[];

  @IsOptional() @ValidateNested() @Type(() => AssinaturaDto) assinatura?: AssinaturaDto;
}

/** Direciona UM item específico para uma Área/Programa (e, opcionalmente, já designa o Coordenador). */
export class DirecionamentoDiretorDto {
  @IsUUID() areaProgramaId: string;

  @IsOptional() @IsUUID() coordenadorId?: string; // omitido = delega ao Gestor (HU05)

  @IsOptional() @IsString() observacao?: string;
}

export class DesignarCoordenadorDto {
  @IsUUID() coordenadorId: string;
}

export class EncaminharItemDto {
  @IsUUID() areaProgramaId: string;
  @IsNotEmpty() @IsString() motivo: string;
}

/**
 * O Coordenador pode corrigir os campos que o Mobilizador/Presidente preencheu
 * (o valor original fica preservado em ItemSolicitacao.valoresOriginais, só
 * para exibição em histórico — o que passa a valer é sempre o mais recente).
 */
export class EditarItemDto {
  @IsOptional() @IsString() tipoEvento?: string;
  @IsOptional() @IsString() acaoAtividade?: string;
  @IsOptional() @IsString() disciplina?: string;
  @IsOptional() @IsEnum(Turno) turno?: Turno;
  @IsOptional() @IsString() dataInicio?: string;
  @IsOptional() @IsString() dataFim?: string;
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

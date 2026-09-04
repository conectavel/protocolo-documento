import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsString, IsUUID } from 'class-validator';
import { Papel } from '../../../common/enums/papel.enum';

export class AtualizarStatusUsuarioDto {
  @IsBoolean() ativo: boolean;
}

/** Move um usuário para outro perfil interno (ver UsuariosAdminService.alterarPapel). */
export class AlterarPapelUsuarioDto {
  @IsEnum(Papel) papel: Papel;
}

export class TransferirProcessosDto {
  @IsUUID() paraUsuarioId: string;
}

/** Um Coordenador pode atender mais de uma Área/Programa. */
export class AtualizarAreasUsuarioDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Selecione ao menos uma Área/Programa.' })
  @IsUUID('4', { each: true })
  areasProgramaIds: string[];
}

export class AtualizarDepartamentoUsuarioDto {
  @IsString() departamento: string;
}

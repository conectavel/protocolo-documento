import { IsArray, IsBoolean, IsString } from 'class-validator';

export class AtualizarPreferenciasDto {
  @IsBoolean() canalSistema: boolean;
  @IsBoolean() canalPush: boolean;
  @IsArray() @IsString({ each: true }) tiposAtivos: string[];
}

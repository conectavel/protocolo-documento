import { IsArray, IsBoolean, IsString } from 'class-validator';

export class AtualizarPreferenciasDto {
  @IsBoolean() canalSistema: boolean;
  @IsBoolean() canalPush: boolean;
  @IsBoolean() canalEmail: boolean;
  @IsArray() @IsString({ each: true }) tiposAtivos: string[];
}

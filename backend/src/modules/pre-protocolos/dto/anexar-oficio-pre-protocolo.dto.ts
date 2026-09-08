import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { SolicitanteTipo } from '../entities/pre-protocolo.entity';

/**
 * Payload para anexar manualmente o ofício em PDF a um Pré-Protocolo que
 * chegou por e-mail sem anexo — o Assessor faz o upload (POST /anexos comum)
 * e informa aqui o id do anexo gerado, junto com quem está solicitando
 * (o e-mail sozinho não deixa isso claro).
 */
export class AnexarOficioPreProtocoloDto {
  @IsNotEmpty() @IsString() anexoOficioId: string;

  @IsIn(['MOBILIZADOR', 'PRESIDENTE'])
  solicitanteTipo: SolicitanteTipo;
}

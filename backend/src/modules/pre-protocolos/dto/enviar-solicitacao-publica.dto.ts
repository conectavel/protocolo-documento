import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { normalizarCpf } from '../../../common/utils/cpf.util';

/**
 * Payload do formulário público de envio anônimo (sem login) — qualquer pessoa
 * pode preencher isso a partir de uma página fora do sistema autenticado. Vira
 * um Pré-Protocolo (`origem = FORMULARIO_PUBLICO`) na mesma fila de triagem do
 * Assessor usada para e-mails, sem nenhum acesso direto ao restante da API.
 *
 * CPF e telefone chegam via multipart/form-data (o formulário também aceita um
 * anexo em PDF), então sempre como string — os `@Transform` abaixo tiram
 * pontuação antes da validação, e a checagem de dígito verificador do CPF é
 * feita no service (`PreProtocolosService`, junto com `isCpfValido`).
 */
export class EnviarSolicitacaoPublicaDto {
  @Transform(({ value }) => normalizarCpf(value))
  @Matches(/^\d{11}$/, { message: 'Informe um CPF válido com 11 dígitos.' })
  cpf: string;

  @IsNotEmpty() @IsString() @MaxLength(150) nome: string;

  @IsDateString({}, { message: 'Informe uma data de nascimento válida.' })
  dataNascimento: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  @Matches(/^\d{10,11}$/, { message: 'Informe um telefone válido com DDD.' })
  telefone: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  telefoneWhatsapp?: boolean;

  @IsNotEmpty() @IsEmail() @MaxLength(180) email: string;
  @IsNotEmpty() @IsString() @MaxLength(200) assunto: string;
  @IsNotEmpty() @IsString() @MaxLength(4000) mensagem: string;
}

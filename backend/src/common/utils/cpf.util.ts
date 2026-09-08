/** Remove tudo que não for dígito (pontos, traço, espaços etc.). */
export function normalizarCpf(valor: string | undefined | null): string {
  return (valor ?? '').replace(/\D/g, '');
}

/**
 * Validação de CPF pelo algoritmo oficial dos dígitos verificadores — usada tanto
 * no envio do formulário público quanto na busca por CPF, para não deixar lixo
 * (ex.: "00000000000" ou sequências repetidas, que passam num regex simples de
 * 11 dígitos mas nunca são CPFs válidos).
 */
export function isCpfValido(cpfBruto: string): boolean {
  const cpf = normalizarCpf(cpfBruto);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const digito1 = calcularDigito(cpf.slice(0, 9), 10);
  const digito2 = calcularDigito(cpf.slice(0, 10), 11);
  return digito1 === Number(cpf[9]) && digito2 === Number(cpf[10]);
}

/**
 * Regras de dinheiro do projeto: TUDO em centavos inteiros.
 * Nunca usar float para somar valores — é a origem clássica de 0,01 de diferença.
 */

export function exigirCentavos(valor: number): number {
  if (!Number.isInteger(valor)) {
    throw new Error(`Valor deve estar em centavos inteiros, recebido: ${valor}`);
  }
  if (!Number.isSafeInteger(valor)) {
    throw new Error(`Valor fora do intervalo seguro: ${valor}`);
  }
  if (valor < 0) {
    throw new Error(`Valor não pode ser negativo: ${valor}`);
  }
  return valor;
}

export function somar(parcelas: number[]): number {
  let total = 0;
  for (const parcela of parcelas) {
    total += exigirCentavos(parcela);
    if (!Number.isSafeInteger(total)) {
      throw new Error('Soma estourou o intervalo seguro de inteiros');
    }
  }
  return total;
}

export function formatarBRL(centavos: number): string {
  exigirCentavos(centavos);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}

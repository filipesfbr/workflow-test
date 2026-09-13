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

const PADRAO_BRL = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/;

/**
 * Converte valor digitado no padrão pt-BR ("R$ 1.234,56", "40,99", "1.234")
 * para centavos inteiros. Ponto é SEMPRE separador de milhar — "40.99" é
 * rejeitado de propósito, porque é ambíguo (o Filipe dita "40 com 99" = 40,99).
 */
export function paraCentavos(entrada: string): number {
  const limpo = entrada.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (limpo === '' || !PADRAO_BRL.test(limpo)) {
    throw new Error(`Valor inválido: "${entrada}" (esperado algo como "1.234,56")`);
  }

  const [reaisTexto = '0', centavosTexto = ''] = limpo.replace(/\./g, '').split(',');
  const reais = Number(reaisTexto);
  const centavos = centavosTexto === '' ? 0 : Number(centavosTexto.padEnd(2, '0'));

  return exigirCentavos(reais * 100 + centavos);
}

/**
 * Aplica um percentual sobre um valor em centavos, arredondando para o centavo
 * mais próximo (meio para cima). Útil para taxa, desconto e comissão.
 */
export function aplicarPercentual(centavos: number, percentual: number): number {
  exigirCentavos(centavos);
  if (!Number.isFinite(percentual) || percentual < 0) {
    throw new Error(`Percentual inválido: ${percentual} (esperado número >= 0)`);
  }
  return Math.round((centavos * percentual) / 100);
}

/**
 * Divide um valor em N partes sem perder centavo: o resto da divisão vai para
 * as primeiras partes. Invariante garantida (e checada no CI): somar(dividir(x, n)) === x.
 */
export function dividir(totalCentavos: number, partes: number): number[] {
  exigirCentavos(totalCentavos);
  if (!Number.isInteger(partes) || partes <= 0) {
    throw new Error(`Partes deve ser inteiro positivo, recebido: ${partes}`);
  }

  const base = Math.floor(totalCentavos / partes);
  const resto = totalCentavos - base * partes;

  return Array.from({ length: partes }, (_, i) => base + (i < resto ? 1 : 0));
}

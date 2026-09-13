import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aplicarPercentual, dividir, formatarBRL, paraCentavos, somar, valorPorExtenso } from '../dist/index.js';

describe('somar', () => {
  it('soma centavos inteiros sem erro de ponto flutuante', () => {
    assert.equal(somar([10, 20, 70]), 100);
    assert.equal(somar([1, 2]), 3);
  });

  it('recusa valor que não é centavo inteiro', () => {
    assert.throws(() => somar([10.5]), /centavos inteiros/);
  });

  it('recusa valor negativo', () => {
    assert.throws(() => somar([-1]), /negativo/);
  });
});

describe('aplicarPercentual', () => {
  it('arredonda para o centavo mais próximo', () => {
    assert.equal(aplicarPercentual(1000, 10), 100);
    assert.equal(aplicarPercentual(1234, 12.5), 154); // 154,25 -> 154
    assert.equal(aplicarPercentual(1236, 12.5), 155); // 154,50 -> 155
    assert.equal(aplicarPercentual(5, 0.5), 0); // 0,025 -> 0
  });

  it('é identidade em 100%', () => {
    for (const valor of [0, 1, 99, 12345, 999999]) {
      assert.equal(aplicarPercentual(valor, 100), valor);
    }
  });

  it('recusa percentual inválido', () => {
    assert.throws(() => aplicarPercentual(1000, -1), /Percentual inválido/);
    assert.throws(() => aplicarPercentual(1000, Number.NaN), /Percentual inválido/);
  });
});

describe('dividir', () => {
  it('divide sem perder centavo, jogando o resto nas primeiras partes', () => {
    assert.deepEqual(dividir(1000, 3), [334, 333, 333]);
    assert.deepEqual(dividir(10, 4), [3, 3, 2, 2]);
    assert.deepEqual(dividir(0, 2), [0, 0]);
  });

  it('mantém a invariante: a soma das partes é o total', () => {
    for (const total of [1, 7, 999, 100000, 1234567]) {
      for (const partes of [1, 2, 3, 7, 13]) {
        assert.equal(somar(dividir(total, partes)), total);
      }
    }
  });

  it('recusa número de partes inválido', () => {
    assert.throws(() => dividir(100, 0), /Partes deve ser inteiro positivo/);
    assert.throws(() => dividir(100, 2.5), /Partes deve ser inteiro positivo/);
  });
});

describe('formatarBRL', () => {
  it('formata no padrão pt-BR', () => {
    assert.equal(formatarBRL(123456).replace(/\u00a0/g, ' '), 'R$ 1.234,56');
  });
});

describe('paraCentavos', () => {
  it('lê o padrão pt-BR', () => {
    assert.equal(paraCentavos('40,99'), 4099);
    assert.equal(paraCentavos('R$ 1.234,56'), 123456);
    assert.equal(paraCentavos('1.234'), 123400);
    assert.equal(paraCentavos('0,5'), 50);
    assert.equal(paraCentavos('40'), 4000);
  });

  it('recusa formato ambíguo ou inválido', () => {
    assert.throws(() => paraCentavos('40.99'), /Valor inválido/);
    assert.throws(() => paraCentavos('1,999'), /Valor inválido/);
    assert.throws(() => paraCentavos('abc'), /Valor inválido/);
  });
});

describe('valorPorExtenso', () => {
  it('cobre singular, plural e centavos', () => {
    assert.equal(valorPorExtenso(1), 'um centavo');
    assert.equal(valorPorExtenso(100), 'um real');
    assert.equal(valorPorExtenso(101), 'um real e um centavo');
    assert.equal(valorPorExtenso(123), 'um real e vinte e três centavos');
  });

  it('usa a escala de mil e milhão', () => {
    assert.equal(valorPorExtenso(100000), 'mil reais');
    assert.equal(valorPorExtenso(150000), 'mil e quinhentos reais');
    assert.equal(valorPorExtenso(100000000), 'um milhão de reais');
  });
});

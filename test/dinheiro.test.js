import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatarBRL, somar, valorPorExtenso } from '../dist/index.js';

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

describe('formatarBRL', () => {
  it('formata no padrão pt-BR', () => {
    assert.equal(formatarBRL(123456).replace(/\u00a0/g, ' '), 'R$ 1.234,56');
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

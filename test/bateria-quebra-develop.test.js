import test from 'node:test';
import assert from 'node:assert/strict';

test('bateria: quebra de proposito', () => {
  assert.equal(1, 2, 'falha intencional da bateria de testes');
});

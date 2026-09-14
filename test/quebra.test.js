// Arquivo temporario: existe so para deixar o CI vermelho de proposito e
// verificar que a develop NAO tem required status check (bug que a gente quer
// documentado). Esta branch e descartada no fim do teste.
import test from 'node:test';
import assert from 'node:assert/strict';

test('teste proposital que falha', () => {
  assert.equal(1, 2);
});

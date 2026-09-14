// Temporario: existe so para o required check "ci" falhar num PR pra main.
import test from 'node:test';
import assert from 'node:assert/strict';

test('falha de proposito', () => {
  assert.equal(1, 2);
});

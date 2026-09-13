/**
 * Check puro de regra "com valor legal": roda em segundos, sem banco, sem rede,
 * sem servidor. É o tipo de check que trava regressão de regra de negócio no CI.
 */
import { valorPorExtenso } from '../dist/index.js';

const CASOS = [
  [0, 'zero reais'],
  [1, 'um centavo'],
  [50, 'cinquenta centavos'],
  [100, 'um real'],
  [101, 'um real e um centavo'],
  [123, 'um real e vinte e três centavos'],
  [180, 'um real e oitenta centavos'],
  [1000, 'dez reais'],
  [1500, 'quinze reais'],
  [10000, 'cem reais'],
  [10100, 'cento e um reais'],
  [100000, 'mil reais'],
  [100050, 'mil reais e cinquenta centavos'],
  [150000, 'mil e quinhentos reais'],
  [120000, 'mil e duzentos reais'],
  [123400, 'mil, duzentos e trinta e quatro reais'],
  [1234567, 'doze mil, trezentos e quarenta e cinco reais e sessenta e sete centavos'],
  [999999, 'nove mil, novecentos e noventa e nove reais e noventa e nove centavos'],
  [100000000, 'um milhão de reais'],
  [100500000, 'um milhão e cinco mil reais'],
];

let falhas = 0;
for (const [entrada, esperado] of CASOS) {
  const obtido = valorPorExtenso(entrada);
  const ok = obtido === esperado;
  if (!ok) falhas += 1;
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${String(entrada).padStart(10)} -> ${obtido}`);
  if (!ok) console.log(`      esperado: ${esperado}`);
}

console.log(`\n${CASOS.length - falhas}/${CASOS.length} casos ok`);
if (falhas > 0) {
  console.error(`${falhas} caso(s) falharam`);
  process.exit(1);
}

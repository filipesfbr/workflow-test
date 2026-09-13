/**
 * Check de arredondamento: o bug clássico é somar em float e perder centavo.
 */
import { aplicarPercentual, dividir, formatarBRL, paraCentavos, somar } from '../dist/index.js';

const CASOS = [
  { parcelas: [10, 20], total: 30 },
  { parcelas: [0, 0], total: 0 },
  { parcelas: [1, 1, 1, 1, 1], total: 5 },
  { parcelas: [9999999, 1], total: 10000000 },
  { parcelas: [33333, 33333, 33334], total: 100000 },
];

let falhas = 0;
for (const caso of CASOS) {
  const total = somar(caso.parcelas);
  const ok = total === caso.total;
  if (!ok) falhas += 1;
  console.log(
    `${ok ? 'ok  ' : 'FALHA'} somar(${caso.parcelas.join(', ')}) = ${total} (${formatarBRL(total)})`,
  );
}

console.log(`\n${CASOS.length - falhas}/${CASOS.length} casos ok`);

const PARSES = [
  ['40,99', 4099],
  ['R$ 1.234,56', 123456],
  ['1.234', 123400],
  ['0,5', 50],
];

for (const [entrada, esperado] of PARSES) {
  const obtido = paraCentavos(entrada);
  const ok = obtido === esperado;
  if (!ok) falhas += 1;
  console.log(`${ok ? 'ok  ' : 'FALHA'} paraCentavos("${entrada}") = ${obtido}`);
}

const RATEIOS = [
  [1000, 3],
  [10, 4],
  [999, 7],
  [1234567, 13],
];

for (const [total, partes] of RATEIOS) {
  const partesCalculadas = dividir(total, partes);
  const somaDasPartes = somar(partesCalculadas);
  const ok = somaDasPartes === total && partesCalculadas.length === partes;
  if (!ok) falhas += 1;
  console.log(
    `${ok ? 'ok  ' : 'FALHA'} dividir(${total}, ${partes}) = [${partesCalculadas.join(', ')}] soma=${somaDasPartes}`,
  );
}

const PERCENTUAIS = [
  [1000, 10, 100],
  [1234, 12.5, 154],
  [1236, 12.5, 155],
  [5, 0.5, 0],
  [999999, 100, 999999],
];

for (const [valor, percentual, esperado] of PERCENTUAIS) {
  const obtido = aplicarPercentual(valor, percentual);
  const ok = obtido === esperado;
  if (!ok) falhas += 1;
  console.log(`${ok ? 'ok  ' : 'FALHA'} aplicarPercentual(${valor}, ${percentual}%) = ${obtido}`);
}

const TOTAL_CASOS = CASOS.length + PARSES.length + RATEIOS.length + PERCENTUAIS.length;
console.log(`\n${TOTAL_CASOS - falhas}/${TOTAL_CASOS} casos ok`);
if (falhas > 0) {
  console.error(`${falhas} caso(s) falharam`);
  process.exit(1);
}

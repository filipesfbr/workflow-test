/**
 * Check de arredondamento: o bug clássico é somar em float e perder centavo.
 */
import { formatarBRL, somar } from '../dist/index.js';

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
if (falhas > 0) {
  console.error(`${falhas} caso(s) falharam`);
  process.exit(1);
}

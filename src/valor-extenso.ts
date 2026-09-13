/**
 * Valor por extenso em pt-BR — o mesmo tipo de regra "com valor legal" que os
 * checks puros pegam sem precisar de banco, rede ou servidor.
 */
import { exigirCentavos } from './dinheiro.js';

const UNIDADES = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete',
  'dezoito', 'dezenove',
];

const DEZENAS = [
  '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta',
  'oitenta', 'noventa',
];

const CENTENAS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos',
  'setecentos', 'oitocentos', 'novecentos',
];

const ESCALAS: ReadonlyArray<readonly [string, string]> = [
  ['', ''],
  ['mil', 'mil'],
  ['milhão', 'milhões'],
  ['bilhão', 'bilhões'],
];

function grupoParaExtenso(grupo: number): string {
  if (grupo === 0) return '';
  if (grupo === 100) return 'cem';

  const centena = Math.floor(grupo / 100);
  const resto = grupo % 100;

  let texto = centena ? (CENTENAS[centena] ?? '') : '';
  if (resto > 0) {
    const restoTexto =
      resto < 20
        ? (UNIDADES[resto] ?? '')
        : `${DEZENAS[Math.floor(resto / 10)] ?? ''}${resto % 10 ? ` e ${UNIDADES[resto % 10] ?? ''}` : ''}`;
    texto = texto ? `${texto} e ${restoTexto}` : restoTexto;
  }
  return texto;
}

function inteiroParaExtenso(valor: number): string {
  if (valor === 0) return 'zero';

  const grupos: number[] = [];
  let restante = valor;
  while (restante > 0) {
    grupos.push(restante % 1000);
    restante = Math.floor(restante / 1000);
  }

  const partes: Array<{ escala: number; grupo: number; texto: string }> = [];
  for (let escala = grupos.length - 1; escala >= 0; escala -= 1) {
    const grupo = grupos[escala] ?? 0;
    if (grupo === 0) continue;

    if (escala === 1) {
      partes.push({ escala, grupo, texto: grupo === 1 ? 'mil' : `${grupoParaExtenso(grupo)} mil` });
    } else if (escala === 0) {
      partes.push({ escala, grupo, texto: grupoParaExtenso(grupo) });
    } else {
      const singular = ESCALAS[escala]?.[0] ?? '';
      const plural = ESCALAS[escala]?.[1] ?? '';
      // escala >= 2 (milhão/bilhão): o "um" não cai — é "um milhão", não "milhão".
      partes.push({
        escala,
        grupo,
        texto: grupo === 1 ? `um ${singular}` : `${grupoParaExtenso(grupo)} ${plural}`,
      });
    }
  }

  // Regra clássica (mesma de cheque/recibo): " e " quando o grupo seguinte é
  // menor que 100 ou centena exata; senão vírgula.
  let texto = partes[0]?.texto ?? '';
  for (let i = 1; i < partes.length; i += 1) {
    const parte = partes[i];
    if (!parte) continue;
    const usaE = parte.grupo < 100 || parte.grupo % 100 === 0;
    texto += usaE ? ` e ${parte.texto}` : `, ${parte.texto}`;
  }
  return texto;
}

export function valorPorExtenso(centavos: number): string {
  exigirCentavos(centavos);

  const reais = Math.floor(centavos / 100);
  const centavosResto = centavos % 100;

  const partes: string[] = [];

  if (reais > 0) {
    const extenso = inteiroParaExtenso(reais);
    // "um milhão de reais" (sem grupo inferior), mas "um milhão e quinhentos mil reais".
    const terminaEmEscala = /(milhão|milhões|bilhão|bilhões)$/.test(extenso);
    const moeda = reais === 1 ? 'real' : 'reais';
    partes.push(terminaEmEscala ? `${extenso} de ${moeda}` : `${extenso} ${moeda}`);
  }

  if (centavosResto > 0) {
    partes.push(`${inteiroParaExtenso(centavosResto)} ${centavosResto === 1 ? 'centavo' : 'centavos'}`);
  }

  return partes.length > 0 ? partes.join(' e ') : 'zero reais';
}

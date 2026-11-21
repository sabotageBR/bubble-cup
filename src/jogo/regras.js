// Regras de um tiro: a perola entra na casa, os grupos de 3 ou mais da mesma cor estouram, a bomba explode
// em volta, a arco-iris vira a cor que forma o maior grupo, o gelo quebra com estouro vizinho, os peixinhos
// se soltam e tudo o que fica sem ligacao com o teto cai. Mais a pontuacao. Puro.
import { ler, gravar, vizinhos, grupoCor, soltas, aparar, chave, combina, posicao } from './grade.js';

/** Tamanho minimo do grupo que estoura. */
export const MIN_GRUPO = 3;

/**
 * @typedef {{ r: number, c: number, x: number, y: number, p: import('./grade.js').Perola }} Peca
 * pousada: a perola que ficou na casa (o mesmo objeto da grade; o desenho prende nela a mola do encaixe).
 * @typedef {{ casa: [number, number], cor: number, estouradas: Peca[], caidas: Peca[], peixes: number,
 *   explodiu: boolean, gelos: Peca[], acertou: boolean, pousada: import('./grade.js').Perola|null }} Resultado
 */

/**
 * Aplica o tiro na grade (muda a grade).
 * @param {import('./grade.js').Grade} g
 * @param {[number, number]} casa
 * @param {import('./grade.js').Perola} perola
 * @returns {Resultado}
 */
export function aplicarTiro(g, casa, perola) {
  const [r, c] = casa;
  const peca = (rr, cc) => {
    const pos = posicao(g, rr, cc);
    return { r: rr, c: cc, x: pos.x, y: pos.y, p: /** @type {import('./grade.js').Perola} */ (ler(g, rr, cc)) };
  };
  /** @type {Resultado} */
  const res = { casa, cor: perola.cor, estouradas: [], caidas: [], peixes: 0, explodiu: false, gelos: [], acertou: false, pousada: null };
  let p = { ...perola };
  if (p.tipo === 'arco') p = { tipo: 'n', cor: melhorCorArco(g, r, c) };
  gravar(g, r, c, p.tipo === 'bomba' ? { tipo: 'n', cor: -9 } : p);
  if (p.tipo !== 'bomba') res.pousada = ler(g, r, c);
  res.cor = p.cor;

  /** @type {Set<number>} */
  const tirar = new Set();
  if (p.tipo === 'bomba') {
    res.explodiu = true;
    tirar.add(chave(r, c));
    for (const [a, b] of vizinhos(g, r, c)) {
      for (const [a2, b2] of vizinhos(g, a, b)) if (ler(g, a2, b2)) tirar.add(chave(a2, b2));
      if (ler(g, a, b)) tirar.add(chave(a, b));
    }
  } else {
    const grupo = grupoCor(g, r, c);
    if (grupo.length >= MIN_GRUPO) for (const [a, b] of grupo) tirar.add(chave(a, b));
  }
  if (tirar.size) {
    // vizinhos de quem estoura: peixe solta junto; gelo quebra (a perola fica, agora combina)
    const extras = new Set();
    for (const k of tirar) {
      const a = Math.floor(k / 64);
      const b = k % 64;
      for (const [a2, b2] of vizinhos(g, a, b)) {
        const v = ler(g, a2, b2);
        const kv = chave(a2, b2);
        if (!v || tirar.has(kv)) continue;
        if (v.tipo === 'peixe') extras.add(kv);
        else if (v.gelo && !extras.has(kv)) {
          v.gelo = false;
          res.gelos.push(peca(a2, b2));
        }
      }
    }
    for (const k of extras) tirar.add(k);
    for (const k of tirar) {
      const a = Math.floor(k / 64);
      const b = k % 64;
      const pe = peca(a, b);
      if (pe.p.cor !== -9) res.estouradas.push(pe);
      if (pe.p.tipo === 'peixe') res.peixes++;
      gravar(g, a, b, null);
    }
    res.acertou = true;
  }
  for (const [a, b] of soltas(g)) {
    const pe = peca(a, b);
    if (pe.p.cor === -9) { gravar(g, a, b, null); continue; }
    res.caidas.push(pe);
    if (pe.p.tipo === 'peixe') res.peixes++;
    gravar(g, a, b, null);
  }
  if (res.caidas.length) res.acertou = true;
  // a perola do tiro que ficou sozinha (sem estouro) e caiu nao conta como queda
  if (!tirar.size && res.caidas.length === 1 && res.caidas[0].r === r && res.caidas[0].c === c) {
    res.caidas = [];
    res.acertou = false;
  }
  aparar(g);
  return res;
}

/**
 * Cor que a arco-iris assume em (r, c): a que forma o maior grupo com os vizinhos.
 * @param {import('./grade.js').Grade} g @param {number} r @param {number} c
 */
export function melhorCorArco(g, r, c) {
  const cores = new Set();
  for (const [a, b] of vizinhos(g, r, c)) {
    const v = ler(g, a, b);
    if (combina(v)) cores.add(/** @type {import('./grade.js').Perola} */ (v).cor);
  }
  let melhor = -1;
  let tam = -1;
  for (const cor of [...cores].sort((x, y) => x - y)) {
    gravar(g, r, c, { tipo: 'n', cor });
    const n = grupoCor(g, r, c).length;
    if (n > tam) { tam = n; melhor = cor; }
  }
  gravar(g, r, c, null);
  return melhor < 0 ? 0 : melhor;
}

/** Multiplicador do combo (tiros seguidos que acertam). @param {number} combo */
export const multiplicador = (combo) => Math.min(3, 1 + 0.25 * Math.max(0, combo - 1));

/**
 * Pontos do tiro.
 * @param {number} estouradas @param {number} caidas @param {number} combo combo JA contando este tiro
 * @param {number} [peixes]
 */
export function pontosTiro(estouradas, caidas, combo, peixes = 0) {
  const base = estouradas * 10 + caidas * 20 + 5 * Math.max(0, caidas - 3) ** 2 + peixes * 50;
  return Math.round(base * multiplicador(combo));
}

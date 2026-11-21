// Aventura: 32 fases em 4 recifes, com objetivos (soltar os peixinhos, soltar tudo do teto, fazer pontos),
// formas de tabuleiro e as perolas especiais entrando aos poucos: peixinhos (1), bomba (2), pedra (4),
// arco-iris (6), gelo (9). Mais o desafio do dia. Tudo gerado pela semente da fase. Puro.
import { criarRng } from '../core/rng.js';
import { criarGrade, gravar, capacidade, contar, cada, aparar, soltas } from './grade.js';

export const FASES = 32;
export const POR_RECIFE = 8;
export const RECIFES = ['jardim', 'algas', 'navio', 'fossa'];
/** Fases sem derrota: acabou o tiro, ganha +5 gratis. */
export const FASES_SEM_DERROTA = 6;

/** Fase em que cada especial aparece pela primeira vez (o jogo mostra a novidade). */
export const ESTREIAS = { peixe: 1, bomba: 2, pedra: 4, arco: 6, gelo: 9 };

/** Formas do tabuleiro: devolve true se a casa (r, c) existe na forma. */
const FORMAS = [
  (_r, _c, _n, _L) => true,
  (r, c, n, L) => Math.abs(c - (n - 1) / 2) <= (L - r) * 0.85 + 0.5, // triangulo de cabeca para baixo
  (r, c, n) => c < n * 0.38 || c > n * 0.6 || r < 2, // duas torres com ponte
  (r, c) => (r + c) % 4 !== 3 || r === 0, // furos
  (r, c, n, L) => r <= L - 1 - Math.round(1.5 + 1.5 * Math.sin((c / (n - 1)) * Math.PI * 2)), // onda
  (r, c, n, L) => Math.abs(c - (n - 1) / 2) >= r * 0.6 - 0.5 || r < 2 || r > L - 2, // V aberto
];

/**
 * @typedef {object} Fase
 * @property {number} n
 * @property {number} recife      0..3
 * @property {import('./partida.js').Config} cfg
 * @property {string[]} novidades  especiais que estreiam nesta fase
 */

/**
 * Configuracao da fase n (1..32), ou do desafio do dia com `dia`.
 * @param {number} n
 * @param {{ dia?: number }} [o]
 * @returns {Fase}
 */
export function fase(n, o = {}) {
  const desafio = o.dia !== undefined;
  const k = desafio ? 8 + (/** @type {number} */ (o.dia) % 17) : n;
  const rng = criarRng(desafio ? (/** @type {number} */ (o.dia) * 7919 + 17) >>> 0 : n * 104729 + 3);
  const recife = desafio ? Math.floor(rng() * 4) : Math.floor((n - 1) / POR_RECIFE);
  const linhas = Math.min(9, 4 + Math.floor(k / 3));
  const tipos = /** @type {const} */ (['peixes', 'limpar', 'pontos']);
  const objetivoTipo = k === 1 ? 'peixes' : k === 2 ? 'limpar' : tipos[(desafio ? Math.floor(rng() * 3) : k) % 3];
  // limpar tudo com 6 cores vira muro: no maximo 5
  const cores = Math.min(objetivoTipo === 'limpar' ? 5 : 6, k <= 3 ? 3 : k <= 12 ? 4 : k <= 26 ? 5 : 6);
  const tem = (esp) => k >= /** @type {Record<string, number>} */ (ESTREIAS)[esp];
  const forma = k <= 2 ? FORMAS[0] : FORMAS[(k * 7 + (desafio ? 3 : 0)) % FORMAS.length];

  const g = criarGrade();
  const ultima = /** @type {(number|null)[]} */ ([]);
  for (let r = 0; r < linhas; r++) {
    const cap = capacidade(g, r);
    let ant = -1;
    for (let c = 0; c < cap; c++) {
      if (!forma(r, c, cap, linhas)) { ant = -1; continue; }
      const u = rng();
      let cor = Math.floor(rng() * cores);
      if (ant >= 0 && u < 0.36) cor = ant;
      else if (ultima[c] != null && u < 0.54) cor = /** @type {number} */ (ultima[c]);
      /** @type {import('./grade.js').Perola} */
      let p = { tipo: 'n', cor };
      const e = rng();
      if (tem('pedra') && r > 0 && e < 0.05 + k * 0.002) p = { tipo: 'pedra', cor: -1 };
      else if (tem('gelo') && e > 0.9 - k * 0.002) p = { tipo: 'n', cor, gelo: true };
      gravar(g, r, c, p);
      ant = p.tipo === 'n' ? cor : -1;
      ultima[c] = ant >= 0 ? ant : null;
    }
  }
  // a forma pode deixar ilhas sem ligacao com o teto: saem antes de comecar
  for (const [r, c] of soltas(g)) gravar(g, r, c, null);
  // peixinhos presos (objetivo de peixes; e alguns de bonus a partir da estreia)
  const nPeixes = objetivoTipo === 'peixes' ? Math.min(8, 3 + Math.floor(k / 5)) : tem('peixe') && k > 3 ? 1 + Math.floor(rng() * 2) : 0;
  const casas = /** @type {[number, number][]} */ ([]);
  // peixes mais no alto (da 2a a 4a fileira): da trabalho de verdade soltar
  cada(g, (p, r, c) => { if (p.tipo === 'n' && r >= 1 && r <= 3) casas.push([r, c]); });
  for (let i = 0; i < nPeixes && casas.length; i++) {
    const j = Math.floor(rng() * casas.length);
    const [r, c] = casas.splice(j, 1)[0];
    gravar(g, r, c, { tipo: 'peixe', cor: -1, peixe: Math.floor(rng() * 3) });
  }
  aparar(g);
  const total = contar(g);
  // tiros generosos: ~60% das perolas + folga (o bot medio passa em mais de 82%)
  const tiros = Math.round(total * (objetivoTipo === 'limpar' ? 0.8 : 0.62) + 10 + (k <= 6 ? 6 : 0) + Math.floor(k / 2.5));
  /** @type {import('./partida.js').Config} */
  const cfg = {
    cores,
    grade: g,
    errosParaLinha: 0,
    penalidade: 0,
    bombaCada: tem('bomba') ? (k === 2 ? 4 : 11) : 0,
    arcoCada: tem('arco') ? (k === 6 ? 5 : 13) : 0,
    inicioEspeciais: k === 2 || k === 6 ? 1 : 5,
    grudar: 0.5,
    duracao: 0,
    tiros,
    objetivo: objetivoTipo === 'pontos' ? { tipo: 'pontos', n: Math.round((total * 18) / 50) * 50 } : { tipo: objetivoTipo },
    recarregar: false,
  };
  const novidades = desafio ? [] : Object.entries(ESTREIAS).filter(([, f]) => f === n).map(([e]) => e);
  return { n, recife, cfg, novidades };
}

/** Peixes da fase (para o objetivo). @param {Fase} f */
export function peixesDaFase(f) {
  let n = 0;
  cada(/** @type {import('./grade.js').Grade} */ (f.cfg.grade), (p) => { if (p.tipo === 'peixe') n++; });
  return n;
}

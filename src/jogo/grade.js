// Grade hexagonal de perolas (linhas deslocadas meia perola), em unidades de raio: cada perola tem raio 1.
// Puro e deterministico (test/estilo.test.js). A linha r e deslocada para a direita quando
// (r + paridade) e impar; a linha deslocada tem COLS - 1 casas. Inserir uma linha no topo troca a paridade,
// entao as linhas que ja existiam ficam com a mesma geometria.

export const COLS = 11;
export const R = 1;
export const ALT = Math.sqrt(3);
export const LARG = COLS * 2 * R;
/** Uma perola nesta linha (ou abaixo) transborda. */
export const LIMITE = 12;
/** Centro do canhao (y), abaixo da linha de limite. */
export const Y_CANHAO = R + ALT * LIMITE + 3.2;
export const X_CANHAO = LARG / 2;

/** Cores na ordem em que entram (4 no bronze, 5 na prata e no ouro, 6 no diamante). */
export const CORES = ['vermelho', 'amarelo', 'azul', 'verde', 'violeta', 'laranja'];

/**
 * tipo: 'n' normal (cor), 'pedra' (nao combina, so cai), 'peixe' (nao combina; solta quando um grupo
 * vizinho estoura ou quando cai), 'bomba' e 'arco' (so no tiro). gelo: perola normal que nao combina
 * ate um estouro vizinho quebrar o gelo.
 * @typedef {{ tipo: 'n'|'pedra'|'peixe'|'bomba'|'arco', cor: number, gelo?: boolean, peixe?: number }} Perola
 * @typedef {{ linhas: (Perola|null)[][], paridade: number }} Grade
 */

/** @returns {Grade} */
export function criarGrade() {
  return { linhas: [], paridade: 0 };
}

/** @param {Grade} g @param {number} r */
export const deslocada = (g, r) => ((r + g.paridade) & 1) === 1;
/** @param {Grade} g @param {number} r */
export const capacidade = (g, r) => (deslocada(g, r) ? COLS - 1 : COLS);

/** @param {Grade} g @param {number} r @param {number} c */
export function posicao(g, r, c) {
  return { x: R + 2 * R * c + (deslocada(g, r) ? R : 0), y: R + r * ALT };
}

/** @param {Grade} g @param {number} r @param {number} c @returns {Perola|null} */
export function ler(g, r, c) {
  if (r < 0 || r >= g.linhas.length || c < 0) return null;
  return g.linhas[r][c] || null;
}

/** @param {Grade} g @param {number} r */
function garantirLinha(g, r) {
  while (g.linhas.length <= r) g.linhas.push(new Array(capacidade(g, g.linhas.length)).fill(null));
}

/** @param {Grade} g @param {number} r @param {number} c @param {Perola|null} p */
export function gravar(g, r, c, p) {
  if (r < 0 || c < 0 || c >= capacidade(g, r)) return;
  garantirLinha(g, r);
  g.linhas[r][c] = p;
}

/** Tira as linhas vazias do fim. @param {Grade} g */
export function aparar(g) {
  while (g.linhas.length && g.linhas[g.linhas.length - 1].every((p) => !p)) g.linhas.pop();
}

/**
 * Vizinhos de (r, c) dentro da largura (linhas abaixo podem nao existir ainda).
 * @param {Grade} g @param {number} r @param {number} c
 * @returns {[number, number][]}
 */
export function vizinhos(g, r, c) {
  const v = /** @type {[number, number][]} */ ([]);
  const add = (rr, cc) => {
    if (rr >= 0 && cc >= 0 && cc < capacidade(g, rr)) v.push([rr, cc]);
  };
  add(r, c - 1);
  add(r, c + 1);
  const d = deslocada(g, r) ? 0 : -1;
  for (const rr of [r - 1, r + 1]) {
    add(rr, c + d);
    add(rr, c + d + 1);
  }
  return v;
}

/** @param {Grade} g @param {(p: Perola, r: number, c: number) => void} fn */
export function cada(g, fn) {
  for (let r = 0; r < g.linhas.length; r++) {
    const l = g.linhas[r];
    for (let c = 0; c < l.length; c++) if (l[c]) fn(/** @type {Perola} */ (l[c]), r, c);
  }
}

/** @param {Grade} g */
export function contar(g) {
  let n = 0;
  cada(g, () => { n++; });
  return n;
}

/** Linha mais baixa com perola (-1 se vazia). @param {Grade} g */
export function linhaMaisBaixa(g) {
  for (let r = g.linhas.length - 1; r >= 0; r--) if (g.linhas[r].some((p) => p)) return r;
  return -1;
}

/** @param {number} r @param {number} c */
export const chave = (r, c) => r * 64 + c;

/**
 * Casas ligadas ao teto (linha 0), por busca em largura.
 * @param {Grade} g
 * @returns {Set<number>}
 */
export function ligadasAoTeto(g) {
  const vistas = new Set();
  const fila = [];
  if (g.linhas.length) {
    g.linhas[0].forEach((p, c) => {
      if (p) { vistas.add(chave(0, c)); fila.push([0, c]); }
    });
  }
  while (fila.length) {
    const [r, c] = /** @type {[number, number]} */ (fila.pop());
    for (const [rr, cc] of vizinhos(g, r, c)) {
      const k = chave(rr, cc);
      if (!vistas.has(k) && ler(g, rr, cc)) { vistas.add(k); fila.push([rr, cc]); }
    }
  }
  return vistas;
}

/**
 * Perolas soltas (sem ligacao com o teto).
 * @param {Grade} g
 * @returns {[number, number][]}
 */
export function soltas(g) {
  const presas = ligadasAoTeto(g);
  const s = /** @type {[number, number][]} */ ([]);
  cada(g, (_p, r, c) => { if (!presas.has(chave(r, c))) s.push([r, c]); });
  return s;
}

/** A perola entra num grupo de cor? (normal e sem gelo) @param {Perola|null} p */
export const combina = (p) => !!p && p.tipo === 'n' && !p.gelo;

/**
 * Grupo da mesma cor que contem (r, c), considerando so perolas que combinam.
 * @param {Grade} g @param {number} r @param {number} c
 * @returns {[number, number][]}
 */
export function grupoCor(g, r, c) {
  const p0 = ler(g, r, c);
  if (!combina(p0)) return [];
  const cor = /** @type {Perola} */ (p0).cor;
  const vistas = new Set([chave(r, c)]);
  const fila = [[r, c]];
  const grupo = /** @type {[number, number][]} */ ([]);
  while (fila.length) {
    const [a, b] = /** @type {[number, number]} */ (fila.pop());
    grupo.push([a, b]);
    for (const [rr, cc] of vizinhos(g, a, b)) {
      const k = chave(rr, cc);
      const p = ler(g, rr, cc);
      if (!vistas.has(k) && combina(p) && /** @type {Perola} */ (p).cor === cor) { vistas.add(k); fila.push([rr, cc]); }
    }
  }
  return grupo;
}

/**
 * Casa vazia mais perto de (x, y) entre as candidatas.
 * @param {Grade} g @param {[number, number][]} cands @param {number} x @param {number} y
 * @returns {[number, number]|null}
 */
export function maisPerto(g, cands, x, y) {
  let melhor = null;
  let dm = Infinity;
  for (const [r, c] of cands) {
    if (ler(g, r, c)) continue;
    const p = posicao(g, r, c);
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < dm - 1e-9) { dm = d; melhor = [r, c]; }
  }
  return /** @type {[number, number]|null} */ (melhor);
}

/** Casa da grade cujo centro e o mais perto de (x, y). @param {Grade} g @param {number} x @param {number} y */
export function casaDe(g, x, y) {
  const r = Math.max(0, Math.round((y - R) / ALT));
  const c = Math.max(0, Math.min(capacidade(g, r) - 1, Math.round((x - R - (deslocada(g, r) ? R : 0)) / (2 * R))));
  return /** @type {[number, number]} */ ([r, c]);
}

/**
 * Insere uma linha no topo (as outras descem uma linha, com a mesma geometria).
 * @param {Grade} g
 * @param {(c: number, n: number) => Perola|null} fazer perola da coluna c numa linha de n casas
 */
export function inserirTopo(g, fazer) {
  g.paridade ^= 1;
  const n = capacidade(g, 0);
  const linha = /** @type {(Perola|null)[]} */ ([]);
  for (let c = 0; c < n; c++) linha.push(fazer(c, n));
  g.linhas.unshift(linha);
}

/** Copia profunda (a IA simula sem mexer na grade real). @param {Grade} g @returns {Grade} */
export function clonar(g) {
  return { paridade: g.paridade, linhas: g.linhas.map((l) => l.map((p) => (p ? { ...p } : null))) };
}

/** Cores normais presentes (para sortear a proxima perola). @param {Grade} g */
export function coresPresentes(g) {
  const s = new Set();
  cada(g, (p) => { if (p.tipo === 'n') s.add(p.cor); });
  return [...s].sort((a, b) => a - b);
}

/**
 * Monta uma grade a partir de texto (testes e o tabuleiro de ensino): uma linha por fileira, um caractere
 * por casa. '.' vazio, '0'-'5' cor, 'P' pedra, 'F' peixe, 'a'-'f' cor com gelo (a = cor 0).
 * @param {string[]} linhas
 * @param {number} [paridade]
 * @returns {Grade}
 */
export function deTexto(linhas, paridade = 0) {
  const g = criarGrade();
  g.paridade = paridade;
  linhas.forEach((txt, r) => {
    garantirLinha(g, r);
    [...txt.replace(/\s+/g, '')].forEach((ch, c) => {
      if (c >= capacidade(g, r)) return;
      gravar(g, r, c, perolaDe(ch, r * 31 + c));
    });
  });
  aparar(g);
  return g;
}

/** @param {string} ch @param {number} n @returns {Perola|null} */
function perolaDe(ch, n) {
  if (ch >= '0' && ch <= '5') return { tipo: 'n', cor: Number(ch) };
  if (ch >= 'a' && ch <= 'f') return { tipo: 'n', cor: ch.charCodeAt(0) - 97, gelo: true };
  if (ch === 'P') return { tipo: 'pedra', cor: -1 };
  if (ch === 'F') return { tipo: 'peixe', cor: -1, peixe: n % 3 };
  return null;
}

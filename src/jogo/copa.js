// Copa: os 12 rivais, as ligas (bronze, prata, ouro, diamante), a chave de 8 (quartas, semi e final) com as
// partidas dos outros simuladas pela habilidade, a copa da semana (semente da semana) e a configuracao de
// cada partida. Puro.
import { criarRng, embaralhar } from '../core/rng.js';

/** id = nome do arquivo de arte (rival-<id>.webp); hab 1 a 10. */
export const RIVAIS = [
  { id: 'pingo', nome: 'Pingo', hab: 1 },
  { id: 'garra', nome: 'Garra', hab: 2 },
  { id: 'mel', nome: 'Mel', hab: 2 },
  { id: 'lulu', nome: 'Lulu', hab: 3 },
  { id: 'rabisco', nome: 'Rabisco', hab: 4 },
  { id: 'tata', nome: 'Dona Tata', hab: 4 },
  { id: 'faisca', nome: 'Faisca', hab: 5 },
  { id: 'estrela', nome: 'Estrela', hab: 6 },
  { id: 'bigode', nome: 'Bigode', hab: 7 },
  { id: 'duda', nome: 'Duda', hab: 8 },
  { id: 'sombra', nome: 'Sombra', hab: 9 },
  { id: 'tuba', nome: 'Tuba', hab: 10 },
];

export const LIGAS = [
  { id: 'bronze', cores: 4, rivais: [0, 1, 2, 3, 4, 5, 6], bombaCada: 14, arcoCada: 0, fundo: 'estadio' },
  { id: 'prata', cores: 5, rivais: [2, 3, 4, 5, 6, 7, 8], bombaCada: 14, arcoCada: 18, fundo: 'jardim' },
  { id: 'ouro', cores: 5, rivais: [4, 5, 6, 7, 8, 9, 10], bombaCada: 16, arcoCada: 18, fundo: 'algas' },
  { id: 'diamante', cores: 6, rivais: [5, 6, 7, 8, 9, 10, 11], bombaCada: 16, arcoCada: 16, fundo: 'fossa' },
];

/** Pontos de liga por resultado e pontos para subir. */
export const PONTOS_LIGA = { campeao: 3, vice: 2, semi: 1, quartas: 0 };
export const PARA_SUBIR = 6;
export const RODADAS = ['quartas', 'semi', 'final'];
/** Segundos de cada partida da copa. */
export const DURACAO = 120;

/** Tabuleiro da primeira partida (ensino): 2 vermelhas seguram um cacho de 26 perolas. */
export const LAYOUT_ENSINO = [
  '1 1 2 2 3 3 . . 0 0 .',
  '1 2 3 2 . . . 3 1 .',
  '2 1 3 . . 2 2 1 3 . .',
  '1 1 . 3 3 2 2 1 . .',
  '. . . 2 2 1 1 3 3 . .',
  '. . . 3 1 1 2 2 . .',
  '. . . . 1 2 2 3 . . .',
];

/**
 * @typedef {object} Copa
 * @property {'liga'|'semana'} tipo
 * @property {number} liga               indice em LIGAS (na semana: a liga de cores)
 * @property {number} semente
 * @property {number[]} chave            8 participantes; -1 = jogador; os outros sao indices em RIVAIS
 * @property {number} rodada             0 quartas, 1 semi, 2 final, 3 acabou
 * @property {number[][]} vencedores     por rodada, os que passaram (em ordem de confronto)
 * @property {number[][]} placares       por rodada, [a, b] de cada confronto simulado ou jogado
 * @property {boolean} ensino
 * @property {boolean} eliminado
 * @property {boolean} campeao
 */

/**
 * Nova copa de liga (ou da semana). Na chave, o jogador pega o mais fraco nas quartas e os fortes vem depois.
 * @param {{ tipo?: 'liga'|'semana', liga: number, semente: number, ensino?: boolean }} o
 * @returns {Copa}
 */
export function criarCopa(o) {
  const tipo = o.tipo || 'liga';
  const rng = criarRng(o.semente);
  let pool;
  let liga = o.liga;
  if (tipo === 'semana') {
    pool = embaralhar(RIVAIS.map((_, i) => i), rng).slice(0, 7);
    liga = 1 + Math.floor(rng() * 2);
  } else pool = LIGAS[liga].rivais.slice();
  const fortes = pool.slice().sort((a, b) => RIVAIS[a].hab - RIVAIS[b].hab || a - b);
  // (J x r0) (r5 x r2) (r3 x r4) (r1 x r6): o mais fraco primeiro, o mais forte do outro lado
  const [r0, r1, r2, r3, r4, r5, r6] = fortes;
  const chave = [-1, r0, r5, r2, r3, r4, r1, r6];
  return { tipo, liga, semente: o.semente >>> 0, chave, rodada: 0, vencedores: [], placares: [], ensino: !!o.ensino, eliminado: false, campeao: false };
}

/** Participantes da rodada atual, em pares. @param {Copa} c @returns {number[]} */
export function participantes(c) {
  return c.rodada === 0 ? c.chave : c.vencedores[c.rodada - 1];
}

/** Rival do jogador nesta rodada (indice em RIVAIS). @param {Copa} c */
export function adversario(c) {
  const p = participantes(c);
  const i = p.indexOf(-1);
  return p[i % 2 === 0 ? i + 1 : i - 1];
}

/** Ajuste de habilidade por liga (o bronze e mais manso; o diamante, mais afiado). */
export const AJUSTE_LIGA = [-2.4, -1.2, -0.3, 0.4];

/** Habilidade efetiva do rival r nesta copa. @param {Copa} c @param {number} r */
export function habEfetiva(c, r) {
  return Math.max(0.5, RIVAIS[r].hab + AJUSTE_LIGA[c.tipo === 'semana' ? 2 : c.liga]);
}

/** Semente do tabuleiro desta rodada. @param {Copa} c */
export const sementeRodada = (c) => (c.semente * 31 + c.rodada * 977 + 13) >>> 0;

/**
 * Configuracao da partida desta rodada.
 * @param {Copa} c
 * @returns {import('./partida.js').Config}
 */
export function configPartida(c) {
  const L = LIGAS[c.liga];
  const primeiraDoEnsino = c.ensino && c.rodada === 0;
  /** @type {import('./partida.js').Config} */
  const cfg = {
    cores: L.cores,
    linhas: 7,
    errosParaLinha: 5,
    penalidade: c.ensino ? 0 : 250,
    bombaCada: L.bombaCada,
    arcoCada: L.arcoCada,
    inicioEspeciais: 4,
    grudar: 0.32,
    duracao: DURACAO,
    recarregar: true,
    segurar: c.ensino,
  };
  if (primeiraDoEnsino) {
    cfg.layout = LAYOUT_ENSINO;
    cfg.primeiras = [0, 1];
    cfg.bombaCada = 0;
    cfg.arcoCada = 0;
    cfg.errosParaLinha = 6;
  } else if (c.ensino && c.rodada === 1) {
    // novidade da semi: a bomba chega cedo
    cfg.bombaCada = 9;
    cfg.inicioEspeciais = 1;
    cfg.arcoCada = 0;
  } else if (c.ensino && c.rodada === 2) {
    // novidade da final: a arco-iris
    cfg.arcoCada = 9;
    cfg.inicioEspeciais = 1;
  }
  return cfg;
}

/**
 * Placar simulado de um rival contra outro (determinstico pela semente da copa).
 * @param {() => number} rng @param {number} a @param {number} b
 * @param {boolean} fracoVence ensino: o mais fraco passa (o jogador pega rivais faceis)
 */
function simularConfronto(rng, a, b, fracoVence) {
  const ha = RIVAIS[a].hab;
  const hb = RIVAIS[b].hab;
  let aVence = rng() < (ha * ha) / (ha * ha + hb * hb);
  if (fracoVence) aVence = ha < hb || (ha === hb && a < b);
  const pts = (h) => Math.round((1400 + h * 380 + rng() * 900) / 10) * 10;
  let pa = pts(ha);
  let pb = pts(hb);
  if (aVence && pa <= pb) [pa, pb] = [pb + 40, pa];
  if (!aVence && pb <= pa) [pa, pb] = [pb, pa + 40];
  return { vencedor: aVence ? a : b, placar: [pa, pb] };
}

/**
 * Registra o resultado do jogador na rodada atual, simula os outros confrontos e avanca.
 * @param {Copa} c @param {boolean} venceu @param {number} pontos @param {number} pontosRival
 * @returns {Copa}
 */
export function registrar(c, venceu, pontos, pontosRival) {
  const rng = criarRng((c.semente ^ (c.rodada * 0x9e3779b1)) >>> 0);
  const p = participantes(c);
  const vence = [];
  const placares = [];
  for (let i = 0; i < p.length; i += 2) {
    const a = p[i];
    const b = p[i + 1];
    if (a === -1 || b === -1) {
      const rival = a === -1 ? b : a;
      vence.push(venceu ? -1 : rival);
      placares.push(a === -1 ? [pontos, pontosRival] : [pontosRival, pontos]);
    } else {
      const s = simularConfronto(rng, a, b, c.ensino);
      vence.push(s.vencedor);
      placares.push(s.placar);
    }
  }
  c.vencedores[c.rodada] = vence;
  c.placares[c.rodada] = placares;
  if (!venceu) {
    c.eliminado = true;
    // termina a chave sem o jogador (para mostrar quem foi campeao)
    while (c.vencedores[c.rodada].length > 1) {
      c.rodada++;
      const q = c.vencedores[c.rodada - 1];
      const v = [];
      const pl = [];
      for (let i = 0; i < q.length; i += 2) {
        const s = simularConfronto(rng, q[i], q[i + 1], false);
        v.push(s.vencedor);
        pl.push(s.placar);
      }
      c.vencedores[c.rodada] = v;
      c.placares[c.rodada] = pl;
    }
    c.rodada = 3;
    return c;
  }
  c.rodada++;
  if (c.rodada === 3) c.campeao = true;
  return c;
}

/** Resultado do jogador na copa: campeao | vice | semi | quartas. @param {Copa} c */
export function colocacao(c) {
  if (c.campeao) return 'campeao';
  const chegou = c.vencedores.filter((v) => v && v.includes(-1)).length;
  return ['quartas', 'semi', 'vice', 'campeao'][chegou];
}

/**
 * Pontos de liga e subida.
 * @param {{ liga: number, pontos: number }} estado @param {string} col
 * @returns {{ liga: number, pontos: number, subiu: boolean }}
 */
export function somarLiga(estado, col) {
  let pontos = estado.pontos + (/** @type {Record<string, number>} */ (PONTOS_LIGA)[col] || 0);
  let liga = estado.liga;
  let subiu = false;
  if (pontos >= PARA_SUBIR && liga < LIGAS.length - 1) {
    liga++;
    pontos = 0;
    subiu = true;
  }
  if (liga === LIGAS.length - 1) pontos = Math.min(pontos, PARA_SUBIR);
  return { liga, pontos, subiu };
}

/**
 * Numero da semana ISO (o main passa ano, mes e dia; aqui nao ha relogio).
 * @param {number} ano @param {number} mes 1..12 @param {number} dia
 * @returns {{ ano: number, semana: number, semente: number }}
 */
export function semanaIso(ano, mes, dia) {
  const diasAte = (a, m, d) => {
    // dias desde 1970-01-01 (calendario gregoriano), sem Date
    const y = m <= 2 ? a - 1 : a;
    const era = Math.floor(y / 400);
    const yoe = y - era * 400;
    const mp = (m + 9) % 12;
    const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
    const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
  };
  const n = diasAte(ano, mes, dia);
  const diaSemana = ((n + 3) % 7 + 7) % 7; // 0 = segunda
  const quinta = n - diaSemana + 3;
  // ano da quinta-feira
  let a = ano;
  if (quinta < diasAte(ano, 1, 1)) a = ano - 1;
  else if (quinta >= diasAte(ano + 1, 1, 1)) a = ano + 1;
  const semana = Math.floor((quinta - diasAte(a, 1, 1)) / 7) + 1;
  return { ano: a, semana, semente: a * 100 + semana };
}

/** Dia corrido (para o desafio do dia e os carimbos). @param {number} ano @param {number} mes @param {number} dia */
export function diaCorrido(ano, mes, dia) {
  const y = mes <= 2 ? ano - 1 : ano;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (mes + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + dia - 1;
  return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
}

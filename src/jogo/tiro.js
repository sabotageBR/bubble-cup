// Trajetoria do tiro: reta com ricochete nas paredes laterais ate tocar uma perola ou o teto, e a casa onde
// a perola para. Puro e deterministico: o jogador, a IA do rival e a linha de mira usam a mesma conta.
import { R, LARG, X_CANHAO, Y_CANHAO, ler, posicao, vizinhos, maisPerto, casaDe, capacidade } from './grade.js';

/**
 * Distancia de toque entre centros: um pouco menor que o diametro (a perola e macia e passa raspando nas
 * frestas quando a geometria deixa). A colisao e exata (varredura continua de circulo contra circulo), nao por
 * passos: o tiro passa por qualquer fresta com folga de TOQUE e para no ponto exato do contato.
 */
export const TOQUE = 1.8 * R;
/** Angulos validos (rad, a partir do eixo x, para cima). */
export const ANG_MIN = 0.13;
export const ANG_MAX = Math.PI - 0.13;

/** @param {number} a */
export const limitarAngulo = (a) => Math.max(ANG_MIN, Math.min(ANG_MAX, a));

/**
 * Angulo do canhao ate um ponto (unidades do tabuleiro). Ponto abaixo do canhao: devolve null.
 * @param {number} x @param {number} y
 */
export function anguloPara(x, y) {
  const dy = Y_CANHAO - y;
  if (dy < 0.6) return null;
  return limitarAngulo(Math.atan2(dy, x - X_CANHAO));
}

/**
 * pontos: o caminho (canhao, cada ricochete e o ponto de contato); quiquesEm: distancia percorrida em cada
 * ricochete; contato: onde a perola tocou; fim: o centro da casa onde ela encaixa.
 * @typedef {{ pontos: {x: number, y: number}[], fim: {x: number, y: number}, contato: {x: number, y: number},
 *   casa: [number, number], comprimento: number, quiques: number, quiquesEm: number[] }} Trajeto
 */

/**
 * Simula o tiro a partir do canhao.
 * @param {import('./grade.js').Grade} g
 * @param {number} ang rad
 * @returns {Trajeto}
 */
export function simular(g, ang) {
  ang = limitarAngulo(ang);
  let dx = Math.cos(ang);
  const dy = -Math.sin(ang);
  let x = X_CANHAO;
  let y = Y_CANHAO;
  const pontos = [{ x, y }];
  /** @type {number[]} */
  const quiquesEm = [];
  let comprimento = 0;
  let quiques = 0;
  /** @type {[number, number]|null} */
  let tocou = null;
  const D2 = TOQUE * TOQUE;
  for (let trecho = 0; trecho < 60; trecho++) {
    // o que vem primeiro neste trecho reto: teto, parede ou perola
    let tMin = (R - y) / dy;
    let oque = 'teto';
    if (dx < -1e-12) {
      const t = (R - x) / dx;
      if (t < tMin) { tMin = t; oque = 'parede'; }
    } else if (dx > 1e-12) {
      const t = (LARG - R - x) / dx;
      if (t < tMin) { tMin = t; oque = 'parede'; }
    }
    /** @type {[number, number]|null} */
    let alvo = null;
    for (let r = 0; r < g.linhas.length; r++) {
      const l = g.linhas[r];
      for (let c = 0; c < l.length; c++) {
        if (!l[c]) continue;
        const p = posicao(g, r, c);
        const fx = x - p.x;
        const fy = y - p.y;
        const b = fx * dx + fy * dy;
        if (b > 0) continue; // ja passou ou vai para longe
        const cc = fx * fx + fy * fy - D2;
        const disc = b * b - cc;
        if (disc < 0) continue;
        const t = Math.max(0, -b - Math.sqrt(disc));
        if (t < tMin) { tMin = t; oque = 'perola'; alvo = [r, c]; }
      }
    }
    tMin = Math.max(0, tMin);
    x += dx * tMin;
    y += dy * tMin;
    comprimento += tMin;
    if (oque === 'parede') {
      x = dx < 0 ? R : LARG - R;
      dx = -dx;
      quiques++;
      quiquesEm.push(comprimento);
      pontos.push({ x, y });
      continue;
    }
    if (oque === 'perola') tocou = alvo;
    else y = R;
    break;
  }
  const contato = { x, y };
  const casa = casaFinal(g, x, y, tocou);
  const fim = posicao(g, casa[0], casa[1]);
  pontos.push(contato);
  return { pontos, fim, contato, casa, comprimento, quiques, quiquesEm };
}


/**
 * Casa vazia onde a perola para: a mais perto do ponto de parada entre os vizinhos vazios da perola tocada
 * (ou a linha do teto). Nunca devolve casa ocupada.
 * @param {import('./grade.js').Grade} g @param {number} x @param {number} y @param {[number, number]|null} tocou
 * @returns {[number, number]}
 */
function casaFinal(g, x, y, tocou) {
  /** @type {[number, number][]} */
  let cands = [];
  if (tocou) cands = vizinhos(g, tocou[0], tocou[1]);
  const perto = casaDe(g, x, y);
  cands.push(perto);
  if (!tocou) {
    for (let c = 0; c < capacidade(g, 0); c++) cands.push([0, c]);
  }
  const m = maisPerto(g, cands, x, y);
  if (m) return m;
  // tudo ocupado em volta (raro): procura em aneis a casa vazia mais perto
  for (let raio = 1; raio < 30; raio++) {
    const anel = /** @type {[number, number][]} */ ([]);
    for (let r = Math.max(0, perto[0] - raio); r <= perto[0] + raio; r++) {
      for (let c = 0; c < capacidade(g, r); c++) if (!ler(g, r, c)) anel.push([r, c]);
    }
    const a = maisPerto(g, anel, x, y);
    if (a) return a;
  }
  return perto;
}

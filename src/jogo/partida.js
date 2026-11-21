// Uma partida: o lado do jogador e (na copa) o lado do rival, cada um com a sua grade a partir da MESMA
// semente (mesmo tabuleiro inicial e mesma sequencia de fileiras novas), a fila de perolas, o voo da perola,
// os pontos, as fileiras que descem depois de N erros, o transbordo, o recife limpo, o relogio e o fim.
// Puro: o tempo entra por passo(dt); os efeitos saem em lado.eventos (o desenho e o som consomem).
import { criarRng } from '../core/rng.js';
import { criarGrade, gravar, inserirTopo, coresPresentes, contar, linhaMaisBaixa, LIMITE, capacidade, deTexto, cada, clonar } from './grade.js';
import { simular } from './tiro.js';
import { aplicarTiro, pontosTiro } from './regras.js';

/** Velocidade da perola em voo (unidades por segundo). */
export const VELOCIDADE = 62;

/**
 * @typedef {object} Config
 * @property {number} cores               quantas cores (2 a 6)
 * @property {number} [linhas]            fileiras do tabuleiro inicial (gerado)
 * @property {string[]} [layout]          tabuleiro inicial fixo (deTexto)
 * @property {import('./grade.js').Grade} [grade]  tabuleiro inicial pronto (aventura)
 * @property {number} [paridade]
 * @property {number} [errosParaLinha]    tiros sem acertar ate descer uma fileira (0: nunca)
 * @property {number} [penalidade]        pontos tirados no transbordo
 * @property {number} [bombaCada]         a cada N perolas da fila vem uma bomba (0: nunca)
 * @property {number} [arcoCada]
 * @property {number} [inicioEspeciais]   especiais so a partir desta perola da fila
 * @property {number[]} [primeiras]       primeiras cores da fila (ensino)
 * @property {number} [pedra]             chance de pedra na fileira gerada
 * @property {number} [peixe]
 * @property {number} [gelo]
 * @property {number} [grudar]            chance de repetir a cor vizinha (cachos)
 * @property {number} [duracao]           s de partida (0: sem relogio)
 * @property {number} [tiros]             limite de tiros (aventura; 0: sem limite)
 * @property {{ tipo: 'limpar'|'peixes'|'pontos', n?: number }} [objetivo]
 * @property {boolean} [recarregar]       recife limpo desce um tabuleiro novo (copa)
 * @property {boolean} [segurar]          rival segura quando passa de 85% do jogador (ensino)
 */

/**
 * @typedef {object} Evento
 * @property {string} tipo
 * @property {any} [pecas]
 * @property {number} [pontos]
 * @property {number} [cor]
 * @property {number} [x]
 * @property {number} [y]
 * @property {number} [n]
 * @property {number} [combo]
 */

/**
 * @typedef {object} Lado
 * @property {import('./grade.js').Grade} grade
 * @property {() => number} rngLinhas
 * @property {() => number} rngFila
 * @property {(number|null)[]} ultimaLinha
 * @property {import('./grade.js').Perola} atual
 * @property {import('./grade.js').Perola} proxima
 * @property {number} sorteadas
 * @property {number} pontos
 * @property {number} combo
 * @property {number} comboMax
 * @property {number} erros
 * @property {number} tiros
 * @property {number} quedaMax
 * @property {number} limpos
 * @property {number} transbordos
 * @property {number} peixes
 * @property {number} estouradas
 * @property {{ traj: import('./tiro.js').Trajeto, t: number, dur: number, perola: import('./grade.js').Perola }|null} voo
 * @property {Evento[]} eventos
 */

/**
 * Gera uma fileira (deterministica pela rng das fileiras).
 * @param {Lado} lado @param {Config} cfg @param {number} n casas
 * @returns {(import('./grade.js').Perola|null)[]}
 */
function fileira(lado, cfg, n) {
  const rng = lado.rngLinhas;
  const grudar = cfg.grudar ?? 0.45;
  const linha = /** @type {(import('./grade.js').Perola|null)[]} */ ([]);
  const cores = /** @type {(number|null)[]} */ ([]);
  for (let c = 0; c < n; c++) {
    const u = rng();
    let cor = Math.floor(rng() * cfg.cores);
    if (c > 0 && cores[c - 1] !== null && u < grudar) cor = /** @type {number} */ (cores[c - 1]);
    else if (lado.ultimaLinha[c] != null && u < grudar * 1.45) cor = /** @type {number} */ (lado.ultimaLinha[c]);
    const e = rng();
    /** @type {import('./grade.js').Perola} */
    let p = { tipo: 'n', cor };
    if (e < (cfg.pedra || 0)) p = { tipo: 'pedra', cor: -1 };
    else if (e < (cfg.pedra || 0) + (cfg.peixe || 0)) p = { tipo: 'peixe', cor: -1, peixe: Math.floor(rng() * 3) };
    else if (e < (cfg.pedra || 0) + (cfg.peixe || 0) + (cfg.gelo || 0)) p = { tipo: 'n', cor, gelo: true };
    cores.push(p.tipo === 'n' ? cor : null);
    linha.push(p);
  }
  lado.ultimaLinha = cores;
  return linha;
}

/**
 * Proxima perola da fila: especiais no compasso, senao uma cor presente no tabuleiro.
 * @param {Lado} lado @param {Config} cfg
 * @returns {import('./grade.js').Perola}
 */
function sortear(lado, cfg) {
  const i = lado.sorteadas++;
  if (cfg.primeiras && i < cfg.primeiras.length) return { tipo: 'n', cor: cfg.primeiras[i] };
  const ini = cfg.inicioEspeciais ?? 6;
  if (i >= ini) {
    if (cfg.bombaCada && (i - ini) % cfg.bombaCada === cfg.bombaCada - 1) return { tipo: 'bomba', cor: -2 };
    if (cfg.arcoCada && (i - ini) % cfg.arcoCada === Math.floor(cfg.arcoCada / 2)) return { tipo: 'arco', cor: -3 };
  }
  return { tipo: 'n', cor: corPresente(lado, cfg) };
}

/** @param {Lado} lado @param {Config} cfg */
function corPresente(lado, cfg) {
  const pres = coresPresentes(lado.grade).filter((c) => c >= 0 && c < 6);
  const lista = pres.length ? pres : Array.from({ length: cfg.cores }, (_, k) => k);
  return lista[Math.floor(lado.rngFila() * lista.length)];
}

/**
 * @param {number} semente
 * @param {Config} cfg
 * @returns {Lado}
 */
export function criarLado(semente, cfg) {
  /** @type {Lado} */
  const lado = {
    grade: criarGrade(),
    rngLinhas: criarRng(semente),
    rngFila: criarRng((semente ^ 0x5bd1e995) >>> 0),
    ultimaLinha: [],
    atual: { tipo: 'n', cor: 0 },
    proxima: { tipo: 'n', cor: 0 },
    sorteadas: 0,
    pontos: 0,
    combo: 0,
    comboMax: 0,
    erros: 0,
    tiros: 0,
    quedaMax: 0,
    limpos: 0,
    transbordos: 0,
    peixes: 0,
    estouradas: 0,
    voo: null,
    eventos: [],
  };
  if (cfg.grade) lado.grade = clonar(cfg.grade);
  else if (cfg.layout) lado.grade = deTexto(cfg.layout, cfg.paridade || 0);
  else encher(lado, cfg, cfg.linhas || 7);
  lado.atual = sortear(lado, cfg);
  lado.proxima = sortear(lado, cfg);
  return lado;
}

/** Tabuleiro novo de N fileiras (de baixo para cima, como se descessem). @param {Lado} lado @param {Config} cfg @param {number} n */
function encher(lado, cfg, n) {
  lado.grade.linhas = [];
  for (let r = 0; r < n; r++) {
    const cap = capacidade(lado.grade, r);
    const l = fileira(lado, cfg, cap);
    l.forEach((p, c) => gravar(lado.grade, r, c, p));
  }
}

/**
 * @typedef {object} Partida
 * @property {'copa'|'aventura'|'desafio'|'treino'} modo
 * @property {Config} cfg
 * @property {number} t
 * @property {Lado} jogador
 * @property {Lado|null} rival
 * @property {any} ia                       estado da IA do rival (src/jogo/rival.js)
 * @property {boolean} relogio              o relogio e o rival andam (falso: so o voo da perola anda)
 * @property {boolean} fim
 * @property {boolean} semTiros
 * @property {number} tirosExtra
 * @property {{ venceu: boolean, pontos: number, pontosRival: number, estrelas: number }|null} resultado
 */

/**
 * @param {Partida['modo']} modo @param {number} semente @param {Config} cfg @param {any} [ia]
 * @returns {Partida}
 */
export function criarPartida(modo, semente, cfg, ia = null) {
  return {
    modo,
    cfg,
    t: 0,
    jogador: criarLado(semente, cfg),
    rival: ia ? criarLado(semente, cfg) : null,
    ia,
    relogio: true,
    fim: false,
    semTiros: false,
    tirosExtra: 0,
    resultado: null,
  };
}

/** Tiros que sobram (aventura; Infinity sem limite). @param {Partida} pt */
export function tirosRestantes(pt) {
  if (!pt.cfg.tiros) return Infinity;
  return Math.max(0, pt.cfg.tiros + pt.tirosExtra - pt.jogador.tiros);
}

/** O relogio acabou? @param {Partida} pt */
export const acabouTempo = (pt) => !!pt.cfg.duracao && pt.t >= pt.cfg.duracao;

/**
 * Atira (se nao tem perola no ar). @param {Partida} pt @param {Lado} lado @param {number} ang
 * @returns {boolean}
 */
export function atirar(pt, lado, ang) {
  if (pt.fim || lado.voo || acabouTempo(pt)) return false;
  if (lado === pt.jogador && tirosRestantes(pt) <= 0) return false;
  const traj = simular(lado.grade, ang);
  const perola = lado.atual;
  lado.voo = { traj, t: 0, dur: Math.max(0.12, traj.comprimento / VELOCIDADE), perola };
  lado.atual = lado.proxima;
  lado.proxima = sortear(lado, pt.cfg);
  lado.tiros++;
  lado.eventos.push({ tipo: 'tiro', cor: perola.cor });
  return true;
}

/** Troca a da vez com a proxima. @param {Lado} lado */
export function trocar(lado) {
  if (lado.voo) return false;
  const a = lado.atual;
  lado.atual = lado.proxima;
  lado.proxima = a;
  lado.eventos.push({ tipo: 'troca' });
  return true;
}

/**
 * Posicao da perola em voo no instante t (para o desenho).
 * @param {import('./tiro.js').Trajeto} traj @param {number} f 0..1
 */
export function pontoNoVoo(traj, f) {
  const alvo = f * traj.comprimento;
  let acum = 0;
  const pts = traj.pontos;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (acum + seg >= alvo || i === pts.length - 1) {
      const k = seg > 0 ? Math.min(1, (alvo - acum) / seg) : 1;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    acum += seg;
  }
  return traj.fim;
}

/**
 * A perola chegou: regras, pontos, fileira nova, transbordo, recife limpo e objetivo.
 * @param {Partida} pt @param {Lado} lado
 */
function pousar(pt, lado) {
  const voo = /** @type {NonNullable<Lado['voo']>} */ (lado.voo);
  lado.voo = null;
  const cfg = pt.cfg;
  // a casa pode ter sido ocupada enquanto a perola voava (fileira nova): refaz o caminho
  let casa = voo.traj.casa;
  const ocupada = lado.grade.linhas[casa[0]] && lado.grade.linhas[casa[0]][casa[1]];
  if (ocupada) casa = simular(lado.grade, Math.atan2(-(voo.traj.pontos[1].y - voo.traj.pontos[0].y), voo.traj.pontos[1].x - voo.traj.pontos[0].x)).casa;
  const res = aplicarTiro(lado.grade, casa, voo.perola);
  if (res.acertou) {
    lado.combo++;
    lado.comboMax = Math.max(lado.comboMax, lado.combo);
    lado.erros = 0;
  } else {
    lado.combo = 0;
    lado.erros++;
  }
  const ganhos = res.acertou ? pontosTiro(res.estouradas.length, res.caidas.length, lado.combo, res.peixes) : 0;
  lado.pontos += ganhos;
  lado.estouradas += res.estouradas.length;
  lado.peixes += res.peixes;
  lado.quedaMax = Math.max(lado.quedaMax, res.caidas.length);
  const pts = voo.traj.pontos;
  const a = pts[pts.length - 2] || pts[0];
  const b = pts[pts.length - 1];
  lado.eventos.push({ tipo: 'pouso', x: voo.traj.fim.x, y: voo.traj.fim.y, cor: res.cor, pecas: res, pontos: ganhos, combo: lado.combo,
    contato: voo.traj.contato, dirX: b.x - a.x, dirY: b.y - a.y });
  if (res.gelos.length) lado.eventos.push({ tipo: 'gelo', pecas: res.gelos });

  if (contar(lado.grade) === 0) {
    lado.limpos++;
    if (cfg.recarregar) {
      lado.pontos += 1000;
      lado.eventos.push({ tipo: 'limpo', pontos: 1000 });
      encher(lado, cfg, cfg.linhas || 7);
    } else lado.eventos.push({ tipo: 'limpo', pontos: 0 });
  } else if (cfg.errosParaLinha && lado.erros >= cfg.errosParaLinha) {
    lado.erros = 0;
    inserirTopo(lado.grade, () => null);
    const nova = fileira(lado, cfg, lado.grade.linhas[0].length);
    lado.grade.linhas[0] = nova;
    lado.eventos.push({ tipo: 'linha' });
  }
  if (linhaMaisBaixa(lado.grade) >= LIMITE) transbordar(pt, lado);
  // a da vez pode ter ficado sem cor no tabuleiro: troca por uma presente
  for (const k of /** @type {const} */ (['atual', 'proxima'])) {
    const p = lado[k];
    if (p.tipo === 'n' && !coresPresentes(lado.grade).includes(p.cor) && contar(lado.grade) > 0) lado[k] = { tipo: 'n', cor: corPresente(lado, cfg) };
  }
  if (lado === pt.jogador) conferirObjetivo(pt);
}

/** Lava as 4 fileiras de baixo (sem pontos) e tira a penalidade. @param {Partida} pt @param {Lado} lado */
function transbordar(pt, lado) {
  lado.transbordos++;
  const corte = LIMITE - 4;
  /** @type {any[]} */
  const lavadas = [];
  cada(lado.grade, (p, r, c) => { if (r >= corte) lavadas.push({ r, c, p }); });
  for (const l of lavadas) gravar(lado.grade, l.r, l.c, null);
  lado.grade.linhas.length = Math.min(lado.grade.linhas.length, corte);
  const pen = Math.min(lado.pontos, pt.cfg.penalidade || 0);
  lado.pontos -= pen;
  lado.combo = 0;
  lado.eventos.push({ tipo: 'transbordo', pontos: -pen, pecas: lavadas });
}

/** @param {Partida} pt */
function conferirObjetivo(pt) {
  const o = pt.cfg.objetivo;
  const j = pt.jogador;
  if (!o) return;
  if (objetivoFeito(pt)) {
    pt.fim = true;
    const sobra = tirosRestantes(pt);
    const total = (pt.cfg.tiros || 1) + pt.tirosExtra;
    const f = sobra === Infinity ? 1 : sobra / total;
    pt.resultado = { venceu: true, pontos: j.pontos, pontosRival: 0, estrelas: pt.tirosExtra ? 1 : f >= 0.5 ? 3 : f >= 0.25 ? 2 : 1 };
    return;
  }
  if (tirosRestantes(pt) <= 0 && !j.voo) pt.semTiros = true;
}

/** @param {Partida} pt */
export function objetivoFeito(pt) {
  const o = pt.cfg.objetivo;
  if (!o) return false;
  const j = pt.jogador;
  if (o.tipo === 'limpar') return contar(j.grade) === 0;
  if (o.tipo === 'peixes') return peixesNoTabuleiro(j.grade) === 0;
  return j.pontos >= (o.n || 0);
}

/** @param {import('./grade.js').Grade} g */
export function peixesNoTabuleiro(g) {
  let n = 0;
  cada(g, (p) => { if (p.tipo === 'peixe') n++; });
  return n;
}

/** Mais tiros (aventura: +5 gratis no ensino ou pelo video). @param {Partida} pt @param {number} n */
export function darTiros(pt, n) {
  pt.tirosExtra += n;
  pt.semTiros = false;
}

/** Desiste (aventura sem tiros): fim com derrota. @param {Partida} pt */
export function encerrarDerrota(pt) {
  pt.fim = true;
  pt.semTiros = false;
  pt.resultado = { venceu: false, pontos: pt.jogador.pontos, pontosRival: 0, estrelas: 0 };
}

/**
 * Avanca a partida: voos, IA do rival (passada de fora para manter este modulo sem dependencia dela),
 * relogio e fim.
 * @param {Partida} pt @param {number} dt
 * @param {(pt: Partida, dt: number) => void} [passoIA]
 */
export function passo(pt, dt, passoIA) {
  if (pt.fim) return;
  if (pt.relogio) pt.t += dt;
  for (const lado of [pt.jogador, pt.rival]) {
    if (!lado || !lado.voo) continue;
    lado.voo.t += dt;
    if (lado.voo.t >= lado.voo.dur) pousar(pt, lado);
  }
  if (pt.rival && passoIA && pt.relogio && !acabouTempo(pt)) passoIA(pt, dt);
  if (acabouTempo(pt) && !pt.jogador.voo && !(pt.rival && pt.rival.voo)) {
    pt.fim = true;
    const pr = pt.rival ? pt.rival.pontos : 0;
    pt.resultado = { venceu: pt.jogador.pontos >= pr, pontos: pt.jogador.pontos, pontosRival: pr, estrelas: 0 };
  }
}

// Desenho da partida em Canvas 2D, com o recife VIVO: as perolas boiam de leve; cada uma tem uma mola que
// cede quando o tiro passa raspando ou bate perto e volta oscilando; a perola do tiro voa esticada, achata no
// ricochete e encaixa com um quique; os grupos estouram em onda a partir do ponto do tiro; o que fica solto
// cai com gravidade, quica no fundo, rola, se esbarra e espirra. O canhao (skin) e uma criatura que segura a
// perola da vez numa bolha de sabao boiando na frente da boca: inspira enquanto o jogador mira e sopra no
// disparo, e a proxima perola sai da concha e voa ate a boca. Mais o HUD. Nao toca portal, audio nem
// salvamento: a logica (src/jogo) nao sabe de nada disto, so o desenho.
import { IMG, BOCA, CORES_ARTE, fundo } from './arte.js';
import { posicao, LARG, Y_CANHAO, X_CANHAO, LIMITE, ALT, R, cada } from '../jogo/grade.js';
import { pontoNoVoo, tirosRestantes, peixesNoTabuleiro } from '../jogo/partida.js';
import { simular } from '../jogo/tiro.js';

export const HEX = ['#ff5a4e', '#ffd23f', '#3d9bff', '#2fbf71', '#9b5cff', '#ff9a2e'];
const ALTURA_TAB = Y_CANHAO + 2.9;
const FONTE = 'Fredoka, "Arial Rounded MT Bold", system-ui, sans-serif';
/** Fundo do aquario do tabuleiro (onde o que cai quica), em unidades. */
const PISO = Y_CANHAO - 2.45;
/** Mola das perolas: rigidez e amortecimento (subamortecida: passa um pouco e volta). */
const MOLA_K = 210;
const MOLA_C = 13;
/** Gravidade e quique do que cai. */
const GRAVIDADE = 64;
const QUIQUE = 0.42;

/**
 * @typedef {{ k: number, ox: number, oy: number, retrato: boolean, W: number, H: number, topo: number,
 *   lados: { esq: {x: number, y: number, w: number}, dir: {x: number, y: number, w: number} } }} Layout
 */

/** @param {number} W @param {number} H @returns {Layout} */
export function layout(W, H) {
  const retrato = W / H < 1.05;
  if (retrato) {
    const topo = Math.max(78, Math.min(118, H * 0.12));
    const k = Math.min((W - 10) / LARG, (H - topo - 6) / ALTURA_TAB);
    const ox = (W - LARG * k) / 2;
    const sobra = H - topo - ALTURA_TAB * k;
    const oy = topo + Math.max(0, sobra * 0.4);
    return { k, ox, oy, retrato, W, H, topo, lados: { esq: { x: 8, y: 8, w: W / 2 - 8 }, dir: { x: W / 2, y: 8, w: W / 2 - 8 } } };
  }
  const k = Math.min((H - 12) / ALTURA_TAB, (W * 0.58) / LARG);
  const ox = (W - LARG * k) / 2;
  const oy = (H - ALTURA_TAB * k) / 2;
  const lw = ox - 20;
  return { k, ox, oy, retrato, W, H, topo: 0, lados: { esq: { x: 12, y: 70, w: lw }, dir: { x: ox + LARG * k + 8, y: 12, w: lw } } };
}

/** @param {Layout} L @param {number} x @param {number} y */
export const naTela = (L, x, y) => ({ x: L.ox + x * L.k, y: L.oy + y * L.k });
/** @param {Layout} L @param {number} X @param {number} Y */
export const noTabuleiro = (L, X, Y) => ({ x: (X - L.ox) / L.k, y: (Y - L.oy) / L.k });

/** Concha da proxima perola (unidades). */
const CONCHA = { x: X_CANHAO - 5.6, y: Y_CANHAO + 0.9 };
/** Centro (px) da proxima perola, para o toque de troca. @param {Layout} L */
export function lugarProxima(L) {
  return naTela(L, CONCHA.x, CONCHA.y);
}

// ------------------------------------------------------------------ estado vivo
/**
 * @typedef {{ x: number, y: number, vx: number, vy: number }} Mola
 * @typedef {{ x: number, y: number, vx: number, vy: number, p: any, rot: number, espera: number, quiques: number, chao: number }} Corpo
 * @typedef {{ tipo: string, x: number, y: number, vx: number, vy: number, vida: number, max: number, p?: any, txt?: string, cor?: string, tam?: number, rot?: number, espera?: number }} Particula
 */

export function criarEfeitos() {
  return {
    /** @type {Particula[]} */
    lista: [],
    /** molas ativas, por objeto de perola da grade */
    /** @type {Map<any, Mola>} */
    molas: new Map(),
    /** perolas soltas caindo com fisica */
    /** @type {Corpo[]} */
    corpos: [],
    /** fase do boiar de cada perola (estavel por objeto) */
    /** @type {WeakMap<any, number>} */
    fases: new WeakMap(),
    nFases: 0,
    tremor: 0,
    /** deslocamento vertical do tabuleiro (fileira nova descendo, com mola), em unidades */
    desce: 0,
    desceV: 0,
    flash: 0,
    /** canhao: s desde o sopro (-1: parado), carga da proxima (0 a 1), troca (0 a 1), folego ao mirar */
    canhao: { sopro: -1, carga: 1, troca: 1, folego: 0 },
    /** textos grandes do centro (combo, recife limpo) */
    /** @type {{ txt: string, vida: number, max: number, cor: string }[]} */
    faixas: [],
  };
}

/** @param {ReturnType<typeof criarEfeitos>} fx @param {any} p */
function fase(fx, p) {
  let f = fx.fases.get(p);
  if (f === undefined) {
    f = (fx.nFases++ * 2.39996) % (Math.PI * 2);
    fx.fases.set(p, f);
  }
  return f;
}

/** Empurra a mola de uma perola (velocidade, unidades/s). @param {ReturnType<typeof criarEfeitos>} fx */
function empurrar(fx, p, vx, vy, x = 0, y = 0) {
  let m = fx.molas.get(p);
  if (!m) {
    m = { x: 0, y: 0, vx: 0, vy: 0 };
    fx.molas.set(p, m);
  }
  m.vx += vx;
  m.vy += vy;
  m.x += x;
  m.y += y;
}

/** Gota que espirra (estouro e respingo). @param {ReturnType<typeof criarEfeitos>} fx */
function gotas(fx, x, y, cor, n, forca) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + x * 1.7 + y;
    const v = forca * (0.6 + ((i * 37) % 10) / 22);
    fx.lista.push({ tipo: 'gota', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - forca * 0.4, vida: 0.5, max: 0.5, cor });
  }
}

/**
 * Efeitos de um evento do lado do jogador (coordenadas do tabuleiro).
 * @param {ReturnType<typeof criarEfeitos>} fx @param {any} ev @param {(c: string, v?: any) => string} t
 * @param {import('../jogo/grade.js').Grade} grade a grade do jogador ja com o tiro aplicado
 */
export function efeitoJogador(fx, ev, t, grade) {
  if (ev.tipo === 'tiro') {
    fx.canhao.sopro = 0;
    fx.canhao.carga = 0;
  } else if (ev.tipo === 'troca') {
    fx.canhao.troca = 0;
  } else if (ev.tipo === 'pouso') {
    const r = ev.pecas;
    const cx = ev.contato ? ev.contato.x : ev.x;
    const cy = ev.contato ? ev.contato.y : ev.y;
    // o baque: as vizinhas cedem para longe do ponto do contato e voltam como mola
    cada(grade, (p, rr, c) => {
      const pos = posicao(grade, rr, c);
      const dx = pos.x - cx;
      const dy = pos.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < 0.01 || d > 5.5 || p === r.pousada) return;
      const f = (r.explodiu ? 16 : 7) / (1 + d * d * 0.35);
      empurrar(fx, p, (dx / d) * f, (dy / d) * f);
    });
    // a perola do tiro encaixa: sai do ponto do contato, segue o embalo e assenta com um quique
    if (r.pousada && ev.contato) {
      const ox = ev.contato.x - ev.x;
      const oy = ev.contato.y - ev.y;
      const n = Math.hypot(ev.dirX || 0, ev.dirY || 0) || 1;
      empurrar(fx, r.pousada, ((ev.dirX || 0) / n) * 5, ((ev.dirY || -1) / n) * 5, ox, oy);
    }
    // estouro em onda a partir do ponto do tiro
    let ultima = 0;
    for (const pe of r.estouradas) {
      const espera = Math.hypot(pe.x - ev.x, pe.y - ev.y) * 0.028;
      ultima = Math.max(ultima, espera);
      fx.lista.push({ tipo: 'estoura', x: pe.x, y: pe.y, vx: 0, vy: 0, vida: espera + 0.18, max: 0.18, p: pe.p, espera });
    }
    // o que ficou solto despenca logo depois do ultimo estouro, com um tremidinho antes
    for (const pe of r.caidas) {
      const vx = (((pe.c * 37 + pe.r * 11) % 9) - 4) * 0.9;
      fx.corpos.push({ x: pe.x, y: pe.y, vx, vy: -2 - ((pe.c + pe.r) % 3), p: pe.p, rot: 0, espera: ultima + 0.06, quiques: 0, chao: 0 });
    }
    if (r.explodiu) {
      fx.lista.push({ tipo: 'onda', x: ev.x, y: ev.y, vx: 0, vy: 0, vida: 0.5, max: 0.5 });
      fx.tremor = Math.max(fx.tremor, 0.35);
    }
    if (ev.pontos > 0) {
      fx.lista.push({ tipo: 'texto', x: Math.max(4, Math.min(LARG - 4, ev.x)), y: Math.max(3.2, ev.y - 1), vx: 0, vy: -3, vida: 1.1, max: 1.1, txt: `+${ev.pontos}`, tam: r.caidas.length >= 10 ? 2.6 : r.caidas.length >= 4 ? 2 : 1.5, cor: r.caidas.length >= 10 ? '#ffd23f' : '#ffffff' });
    }
    if (r.caidas.length >= 10) {
      fx.tremor = Math.max(fx.tremor, 0.5);
      fx.faixas.push({ txt: t(r.caidas.length >= 20 ? 'quedaEnorme' : 'quedaGrande'), vida: 1.4, max: 1.4, cor: '#ffd23f' });
    } else if (ev.combo >= 3) fx.faixas.push({ txt: t('combo', { n: ev.combo }), vida: 0.9, max: 0.9, cor: '#7fe7e0' });
  } else if (ev.tipo === 'linha') {
    fx.desce = -ALT;
    fx.desceV = 0;
  } else if (ev.tipo === 'limpo') {
    fx.faixas.push({ txt: ev.pontos ? `${t('recifeLimpo')} +${ev.pontos}` : t('recifeLimpo'), vida: 1.8, max: 1.8, cor: '#7fe7e0' });
  } else if (ev.tipo === 'transbordo') {
    for (const l of ev.pecas || []) {
      const p = { x: R + 2 * l.c, y: R + l.r * ALT };
      fx.corpos.push({ x: p.x, y: p.y, vx: 0, vy: 1, p: l.p, rot: 0, espera: 0, quiques: 0, chao: 0 });
    }
    fx.flash = 0.5;
    fx.faixas.push({ txt: ev.pontos ? `${t('transbordou')} ${ev.pontos}` : t('transbordou'), vida: 1.5, max: 1.5, cor: '#ff8a7a' });
  } else if (ev.tipo === 'gelo') {
    for (const pe of ev.pecas) fx.lista.push({ tipo: 'brilho', x: pe.x, y: pe.y, vx: 0, vy: 0, vida: 0.4, max: 0.4 });
  }
}

/** Texto que sobe junto ao placar do rival. @param {ReturnType<typeof criarEfeitos>} fx @param {any} ev */
export function efeitoRival(fx, ev) {
  if (ev.tipo === 'pouso' && ev.pontos > 0) fx.lista.push({ tipo: 'rival', x: 0, y: 0, vx: 0, vy: -26, vida: 1, max: 1, txt: `+${ev.pontos}` });
}

/**
 * Um passo do recife vivo (chamar a cada passo da partida, depois da logica).
 * @param {ReturnType<typeof criarEfeitos>} fx @param {number} dt
 * @param {import('../jogo/partida.js').Partida|null} [pt] para a perola em voo empurrar as que ela raspa
 * @param {boolean} [mirando] o canhao enche o folego enquanto o jogador mira
 */
export function passoEfeitos(fx, dt, pt = null, mirando = false) {
  // particulas simples
  for (const p of fx.lista) {
    p.vida -= dt;
    if (p.tipo === 'estoura') {
      if (p.espera !== undefined && p.espera > 0) {
        p.espera -= dt;
        if (p.espera <= 0) {
          const cor = p.p.tipo === 'n' ? HEX[p.p.cor] || '#fff' : '#cfefff';
          gotas(fx, p.x, p.y, cor, 7, 9);
          fx.lista.push({ tipo: 'brilho', x: p.x, y: p.y, vx: 0, vy: 0, vida: 0.32, max: 0.32 });
          fx.lista.push({ tipo: 'anel', x: p.x, y: p.y, vx: 0, vy: 0, vida: 0.28, max: 0.28, cor });
          if (p.p.tipo === 'peixe') fx.lista.push({ tipo: 'peixe', x: p.x, y: p.y, vx: p.x < LARG / 2 ? -7 : 7, vy: -6, vida: 1.6, max: 1.6, p: p.p });
        }
      }
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.tipo === 'gota') p.vy += 26 * dt;
    if (p.tipo === 'peixe') p.vy -= 2 * dt;
    if (p.tipo === 'bolhinha') { p.vy -= 3 * dt; p.vx *= 1 - dt * 2; }
  }
  // corpos que caem: gravidade, paredes, fundo com quique e atrito, rolar, esbarrar e espirrar
  for (const c of fx.corpos) {
    if (c.espera > 0) { c.espera -= dt; continue; }
    c.vy += GRAVIDADE * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.rot += (c.vx / R) * dt;
    if (c.x < R) { c.x = R; c.vx = Math.abs(c.vx) * 0.6; }
    if (c.x > LARG - R) { c.x = LARG - R; c.vx = -Math.abs(c.vx) * 0.6; }
    if (c.y > PISO) {
      c.y = PISO;
      if (c.vy > 6) { c.quiques++; gotas(fx, c.x, PISO + R * 0.8, '#bff6f1', 3, 5); }
      c.vy = -c.vy * QUIQUE;
      c.vx *= 0.8;
      c.chao += dt;
    }
  }
  // esbarrao entre os que caem (empurra para fora e troca a velocidade na normal)
  const cs = fx.corpos;
  for (let i = 0; i < cs.length; i++) {
    const a = cs[i];
    if (a.espera > 0) continue;
    for (let j = i + 1; j < cs.length; j++) {
      const b = cs[j];
      if (b.espera > 0) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      const min = 2 * R * 0.94;
      if (d2 >= min * min || d2 < 1e-6) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d;
      const ny = dy / d;
      const sobra = (min - d) / 2;
      a.x -= nx * sobra; a.y -= ny * sobra;
      b.x += nx * sobra; b.y += ny * sobra;
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn < 0) {
        const imp = -vn * 0.65;
        a.vx -= nx * imp; a.vy -= ny * imp;
        b.vx += nx * imp; b.vy += ny * imp;
      }
    }
  }
  // depois de quicar e rolar um pouco, cada uma espirra
  fx.corpos = fx.corpos.filter((c) => {
    const acabou = c.quiques >= 2 || c.chao > 0.45 || c.y > ALTURA_TAB;
    if (acabou) {
      const cor = c.p.tipo === 'n' ? HEX[c.p.cor] || '#fff' : '#cfefff';
      gotas(fx, c.x, c.y, cor, 6, 8);
      fx.lista.push({ tipo: 'respingo', x: c.x, y: c.y, vx: 0, vy: 0, vida: 0.32, max: 0.32 });
      if (c.p.tipo === 'peixe') fx.lista.push({ tipo: 'peixe', x: c.x, y: c.y, vx: c.vx > 0 ? 7 : -7, vy: -7, vida: 1.6, max: 1.6, p: c.p });
    }
    return !acabou;
  });
  fx.lista = fx.lista.filter((p) => p.vida > 0 && p.y < ALTURA_TAB + 6);
  // molas das perolas da grade
  for (const [p, m] of fx.molas) {
    const passos = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / passos;
    for (let i = 0; i < passos; i++) {
      m.vx += (-MOLA_K * m.x - MOLA_C * m.vx) * h;
      m.vy += (-MOLA_K * m.y - MOLA_C * m.vy) * h;
      m.x += m.vx * h;
      m.y += m.vy * h;
    }
    if (Math.abs(m.x) + Math.abs(m.y) < 0.002 && Math.abs(m.vx) + Math.abs(m.vy) < 0.02) fx.molas.delete(p);
  }
  // a perola em voo raspa nas vizinhas: elas abrem caminho
  if (pt && pt.jogador.voo) {
    const v = pt.jogador.voo;
    const f = Math.min(1, v.t / v.dur);
    const q = pontoNoVoo(v.traj, f);
    const g = pt.jogador.grade;
    cada(g, (p, r, c) => {
      const pos = posicao(g, r, c);
      const dx = pos.x - q.x;
      const dy = pos.y - q.y;
      const d = Math.hypot(dx, dy);
      if (d > 2.3 || d < 0.01) return;
      const forca = (2.3 - d) * 26 * dt;
      empurrar(fx, p, (dx / d) * forca, (dy / d) * forca);
    });
  }
  // fileira nova: o tabuleiro desce e assenta com mola
  fx.desceV += (-120 * fx.desce - 11 * fx.desceV) * dt;
  fx.desce += fx.desceV * dt;
  if (Math.abs(fx.desce) < 0.001 && Math.abs(fx.desceV) < 0.01) { fx.desce = 0; fx.desceV = 0; }
  // canhao
  const ca = fx.canhao;
  if (ca.sopro >= 0) { ca.sopro += dt; if (ca.sopro > 0.6) ca.sopro = -1; }
  ca.carga = Math.min(1, ca.carga + dt / 0.24);
  ca.troca = Math.min(1, ca.troca + dt / 0.2);
  ca.folego += ((mirando ? 1 : 0) - ca.folego) * Math.min(1, dt * 5);
  if (ca.sopro >= 0 && ca.sopro < dt * 1.5) {
    for (let i = 0; i < 4; i++) fx.lista.push({ tipo: 'bolhinha', x: X_CANHAO + (i - 1.5) * 0.4, y: Y_CANHAO + 0.6, vx: (i - 1.5) * 2, vy: -2 - i, vida: 0.7, max: 0.7, tam: 0.35 + (i % 2) * 0.2 });
  }
  fx.tremor = Math.max(0, fx.tremor - dt);
  fx.flash = Math.max(0, fx.flash - dt);
  for (const fa of fx.faixas) fa.vida -= dt;
  fx.faixas = fx.faixas.filter((fa) => fa.vida > 0);
}

// ------------------------------------------------------------------ pecas
/** @param {any} p */
function imagemDe(p) {
  if (p.tipo === 'n') return IMG[CORES_ARTE[p.cor]];
  if (p.tipo === 'pedra') return IMG['perola-pedra'];
  if (p.tipo === 'peixe') return IMG[`peixe-${(p.peixe || 0) + 1}`];
  if (p.tipo === 'bomba') return IMG['perola-bomba'];
  if (p.tipo === 'arco') return IMG['perola-arco'];
  return null;
}

/**
 * @param {CanvasRenderingContext2D} g @param {any} p perola @param {number} X @param {number} Y @param {number} d diametro px
 * @param {number} [sx] escala em x (achatar/esticar) @param {number} [sy] @param {number} [ang] direcao do achatamento
 */
export function perola(g, p, X, Y, d, sx = 1, sy = 1, ang = 0) {
  const im = imagemDe(p);
  const deformada = sx !== 1 || sy !== 1;
  if (deformada) {
    g.save();
    g.translate(X, Y);
    g.rotate(ang);
    g.scale(sx, sy);
    g.rotate(-ang);
    X = 0;
    Y = 0;
  }
  if (p.gelo) {
    const din = d * 0.74;
    if (im) g.drawImage(im, X - din / 2, Y - din / 2, din, din);
    const anel = IMG['anel-gelo'];
    if (anel) g.drawImage(anel, X - d / 2, Y - d / 2, d, d);
  } else if (im) {
    if (p.tipo === 'bomba') g.drawImage(im, X - d * 0.56, Y - d * 0.62, d * 1.12, d * 1.12 * (im.height / im.width));
    else g.drawImage(im, X - d / 2, Y - d / 2, d, d);
  } else {
    g.fillStyle = HEX[p.cor] || '#ccc';
    g.beginPath();
    g.arc(X, Y, d / 2, 0, Math.PI * 2);
    g.fill();
  }
  if (deformada) g.restore();
}

/** Fundo cobrindo a tela. @param {CanvasRenderingContext2D} g @param {number} W @param {number} H @param {string} nome */
export function desenharFundo(g, W, H, nome) {
  const im = fundo(nome, W / H < 1.05);
  if (!im) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#2ec4e6');
    gr.addColorStop(1, '#0b5a8a');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    return;
  }
  const s = Math.max(W / im.width, H / im.height);
  const w = im.width * s;
  const h = im.height * s;
  g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
}

/** @param {CanvasRenderingContext2D} g */
function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Texto com contorno escuro (leitura sobre o fundo). @param {CanvasRenderingContext2D} g */
export function texto(g, s, x, y, tam, cor = '#fff', alinhar = /** @type {CanvasTextAlign} */ ('center')) {
  g.font = `700 ${Math.round(tam)}px ${FONTE}`;
  g.textAlign = alinhar;
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = Math.max(3, tam * 0.18);
  g.strokeStyle = '#0b2545';
  g.strokeText(s, x, y);
  g.fillStyle = cor;
  g.fillText(s, x, y);
}

/** @param {number} n */
export const milhar = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Direcao do trajeto no ponto (para esticar a perola no voo). @param {any} traj @param {number} s */
function direcaoNoVoo(traj, s) {
  let acum = 0;
  const pts = traj.pontos;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (acum + seg >= s || i === pts.length - 1) return Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
    acum += seg;
  }
  return -Math.PI / 2;
}

/**
 * Desenha a partida.
 * @param {CanvasRenderingContext2D} g
 * @param {import('../jogo/partida.js').Partida} pt
 * @param {Layout} L
 * @param {ReturnType<typeof criarEfeitos>} fx
 * @param {{ mira: number|null, skin: string, rival: { id: string, nome: string }|null, t: number, limpo: boolean,
 *   rotuloFase: string, objetivo: string, voce: string, mudoRelogio?: boolean, relogioLigado: boolean, segurando?: boolean,
 *   fundo: string, tituloTempo?: string }} o
 */
export function desenharPartida(g, pt, L, fx, o) {
  const { k } = L;
  const j = pt.jogador;
  const tremX = fx.tremor > 0 ? Math.sin(o.t * 80) * fx.tremor * k * 0.5 : 0;
  desenharFundo(g, L.W, L.H, o.fundo);
  g.save();
  g.translate(tremX, 0);
  // moldura do tabuleiro
  const bx = L.ox - k * 0.3;
  const by = L.oy - k * 0.3;
  const bw = LARG * k + k * 0.6;
  const bh = (Y_CANHAO - 1.2) * k + k * 0.3;
  g.fillStyle = 'rgba(8, 36, 72, 0.42)';
  rrect(g, bx, by, bw, bh, k * 0.8);
  g.fill();
  g.lineWidth = Math.max(2, k * 0.14);
  g.strokeStyle = 'rgba(127, 231, 224, 0.55)';
  g.stroke();
  // linha de limite
  const yLim = L.oy + (R + ALT * LIMITE - ALT * 0.5) * k;
  let baixo = -1;
  cada(j.grade, (_p, r) => { if (r > baixo) baixo = r; });
  const perigo = baixo >= LIMITE - 2;
  g.setLineDash([k * 0.5, k * 0.45]);
  g.strokeStyle = perigo ? `rgba(255, 90, 78, ${0.6 + 0.4 * Math.sin(o.t * 10)})` : 'rgba(255, 255, 255, 0.28)';
  g.lineWidth = Math.max(2, k * 0.12);
  g.beginPath();
  g.moveTo(L.ox, yLim);
  g.lineTo(L.ox + LARG * k, yLim);
  g.stroke();
  g.setLineDash([]);

  // perolas: posicao da grade + boiar + mola (as que estao embaladas esticam na direcao do movimento)
  const d = 2 * R * k * 1.04;
  const desce = fx.desce * k;
  cada(j.grade, (p, r, c) => {
    const pos = posicao(j.grade, r, c);
    const ph = fase(fx, p);
    const amp = perigo && r >= LIMITE - 3 ? 2.2 : 1;
    let x = pos.x + Math.sin(o.t * 1.7 + ph) * 0.035 * amp;
    let y = pos.y + Math.cos(o.t * 1.3 + ph * 1.3) * 0.05 * amp + (p.tipo === 'peixe' ? Math.sin(o.t * 3 + c) * 0.06 : 0);
    const m = fx.molas.get(p);
    let sx = 1;
    let sy = 1;
    let ang = 0;
    if (m) {
      x += m.x;
      y += m.y;
      const v = Math.hypot(m.vx, m.vy);
      const e = Math.min(0.16, v * 0.012);
      sx = 1 + e;
      sy = 1 - e * 0.8;
      ang = Math.atan2(m.vy, m.vx);
    }
    perola(g, p, L.ox + x * k, L.oy + y * k + desce, d, sx, sy, ang);
  });

  // mira: caminho com ricochete e a perola-fantasma
  if (o.mira !== null && !j.voo && !pt.fim) {
    const tr = simular(j.grade, o.mira);
    g.fillStyle = '#ffffff';
    let acum = 0;
    const passoPonto = 1.15;
    let prox = 0.9;
    const corre = (o.t * 2.2) % passoPonto;
    for (let i = 1; i < tr.pontos.length; i++) {
      const a = tr.pontos[i - 1];
      const b = tr.pontos[i];
      const seg = Math.hypot(b.x - a.x, b.y - a.y);
      while (prox + corre <= acum + seg) {
        const f = (prox + corre - acum) / seg;
        const x = a.x + (b.x - a.x) * f;
        const y = a.y + (b.y - a.y) * f;
        g.globalAlpha = Math.max(0.25, 1 - prox / 34);
        g.beginPath();
        g.arc(L.ox + x * k, L.oy + y * k, k * 0.2, 0, Math.PI * 2);
        g.fill();
        prox += passoPonto;
      }
      acum += seg;
    }
    g.globalAlpha = 0.45 + Math.sin(o.t * 6) * 0.08;
    perola(g, j.atual, L.ox + tr.fim.x * k, L.oy + tr.fim.y * k, d);
    g.globalAlpha = 1;
  }

  // perola em voo: rastro, esticada no sentido do voo e achatada no ricochete
  if (j.voo) {
    const v = j.voo;
    const f = Math.min(1, v.t / v.dur);
    const s = f * v.traj.comprimento;
    for (let i = 3; i >= 1; i--) {
      const sr = Math.max(0, s - i * 0.9);
      const q = pontoNoVoo(v.traj, sr / v.traj.comprimento);
      g.globalAlpha = 0.09 * (4 - i);
      perola(g, v.perola, L.ox + q.x * k, L.oy + q.y * k, d * (1 - i * 0.12));
    }
    g.globalAlpha = 1;
    const q = pontoNoVoo(v.traj, f);
    let sx = 1.12;
    let sy = 0.9;
    let ang = direcaoNoVoo(v.traj, s);
    for (const sq of v.traj.quiquesEm || []) {
      const dist = Math.abs(s - sq);
      if (dist < 1.1) {
        const qf = (1 - dist / 1.1) * 0.32;
        sx = 1 - qf;
        sy = 1 + qf * 0.7;
        ang = 0;
      }
    }
    perola(g, v.perola, L.ox + q.x * k, L.oy + q.y * k, d, sx, sy, ang);
  }

  // o que cai (atras do canhao; com um tremidinho antes de soltar)
  for (const c of fx.corpos) {
    const tremeX = c.espera > 0 ? Math.sin(o.t * 70 + c.x) * 0.06 : 0;
    g.save();
    g.translate(L.ox + (c.x + tremeX) * k, L.oy + c.y * k);
    g.rotate(c.rot);
    perola(g, c.p, 0, 0, d);
    g.restore();
  }

  // canhao e concha
  desenharCanhao(g, L, fx, o.skin, o.mira, j, d, o.t);

  // contador de erros (fileira nova) ou tiros restantes
  if (pt.cfg.errosParaLinha) {
    const n = pt.cfg.errosParaLinha;
    for (let i = 0; i < n; i++) {
      const x = L.ox + (X_CANHAO + 4.2 + i * 1.05) * k;
      const y = L.oy + (Y_CANHAO + 1.3) * k;
      g.beginPath();
      g.arc(x, y, k * 0.36, 0, Math.PI * 2);
      g.fillStyle = i < n - j.erros ? '#7fe7e0' : 'rgba(255,255,255,0.18)';
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = '#0b2545';
      g.stroke();
    }
  } else if (pt.cfg.tiros) {
    const rest = tirosRestantes(pt);
    const x = L.ox + (X_CANHAO + 5.6) * k;
    const y = L.oy + (Y_CANHAO + 0.9) * k;
    texto(g, String(rest), x, y, k * 1.5, rest <= 3 ? '#ff8a7a' : '#ffffff');
  }

  // particulas
  for (const p of fx.lista) {
    const X = L.ox + p.x * k;
    const Y = L.oy + p.y * k;
    const f = p.vida / p.max;
    if (p.tipo === 'estoura') {
      if (p.espera !== undefined && p.espera > 0) perola(g, p.p, X, Y, d);
      else {
        // incha e some
        const kk = Math.max(0, Math.min(1, f));
        g.globalAlpha = kk;
        perola(g, p.p, X, Y, d * (1 + (1 - kk) * 0.45));
      }
    } else if (p.tipo === 'brilho' && IMG.brilho) {
      const s = d * (0.6 + (1 - f) * 1.1);
      g.globalAlpha = f;
      g.drawImage(IMG.brilho, X - s / 2, Y - s / 2, s, s);
    } else if (p.tipo === 'anel') {
      g.globalAlpha = f * 0.9;
      g.strokeStyle = p.cor || '#fff';
      g.lineWidth = Math.max(1.5, k * 0.18 * f);
      g.beginPath();
      g.arc(X, Y, d * (0.5 + (1 - f) * 0.9), 0, Math.PI * 2);
      g.stroke();
    } else if (p.tipo === 'gota') {
      g.globalAlpha = Math.min(1, f * 1.6);
      g.fillStyle = p.cor || '#fff';
      g.beginPath();
      g.arc(X, Y, k * (0.12 + 0.16 * f), 0, Math.PI * 2);
      g.fill();
    } else if (p.tipo === 'bolhinha' && IMG.bolha) {
      const s = k * (p.tam || 0.4) * 2;
      g.globalAlpha = Math.min(1, f * 2) * 0.8;
      g.drawImage(IMG.bolha, X - s / 2, Y - s / 2, s, s);
    } else if (p.tipo === 'peixe') {
      const im = IMG[`peixe-${((p.p && p.p.peixe) || 0) + 1}`];
      if (im) {
        g.globalAlpha = Math.min(1, f * 2);
        g.save();
        g.translate(X, Y);
        g.rotate(Math.sin(o.t * 12) * 0.2);
        g.drawImage(im, -d * 0.6, -d * 0.6, d * 1.2, d * 1.2);
        g.restore();
      }
    } else if ((p.tipo === 'onda' || p.tipo === 'respingo') && IMG.respingo) {
      const s = p.tipo === 'onda' ? d * (1 + (1 - f) * 4) : d * (0.8 + (1 - f) * 1.2);
      g.globalAlpha = f;
      g.drawImage(IMG.respingo, X - s / 2, Y - s * 0.6, s, s);
    } else if (p.tipo === 'texto') {
      g.globalAlpha = Math.min(1, f * 2.5);
      texto(g, p.txt || '', X, Y, k * (p.tam || 1.5), p.cor);
    }
    g.globalAlpha = 1;
  }
  g.restore();

  if (fx.flash > 0) {
    g.fillStyle = `rgba(255, 90, 78, ${fx.flash * 0.35})`;
    g.fillRect(0, 0, L.W, L.H);
  }
  // faixas grandes no meio do tabuleiro
  fx.faixas.forEach((f, i) => {
    const a = f.vida / f.max;
    const s = 1 + (a > 0.85 ? (a - 0.85) * 3 : 0);
    g.globalAlpha = Math.min(1, a * 3);
    texto(g, f.txt, L.ox + (LARG / 2) * k, L.oy + (9 - i * 2.4) * k, k * 2.1 * s, f.cor);
    g.globalAlpha = 1;
  });

  if (!o.limpo) hud(g, pt, L, fx, o);
}

/** Ponto numa curva (arco) de a ate b, com altura h. */
function arco(a, b, f, h) {
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f - Math.sin(f * Math.PI) * h };
}

/**
 * Canhao vivo: a criatura (skin) com a perola da vez numa bolha de sabao boiando na frente da boca. Inspira
 * (incha) enquanto o jogador mira, sopra no disparo (encolhe, achata e solta bolhinhas) e a proxima perola
 * voa da concha ate a boca.
 * @param {CanvasRenderingContext2D} g @param {Layout} L @param {ReturnType<typeof criarEfeitos>} fx
 * @param {string} skin @param {number|null} mira @param {import('../jogo/partida.js').Lado} j @param {number} d @param {number} t
 */
function desenharCanhao(g, L, fx, skin, mira, j, d, t) {
  const k = L.k;
  const ca = fx.canhao;
  const im = IMG[`canhao-${skin}`] || IMG['canhao-baiacu'];
  const boca = BOCA[skin] || BOCA.baiacu;
  const P = naTela(L, X_CANHAO, Y_CANHAO);
  const ang = mira === null ? Math.PI / 2 : mira;
  const esquerda = ang > Math.PI / 2;
  const incl = esquerda ? Math.PI - ang : ang;
  // folego: incha ao mirar; sopro: encolhe rapido e volta oscilando
  let escala = 1 + ca.folego * 0.07 + Math.sin(t * 2.2) * 0.012;
  let achata = 1;
  if (ca.sopro >= 0) {
    const s = ca.sopro;
    const mola = Math.exp(-s * 7) * Math.cos(s * 22);
    escala = 1 - 0.13 * mola;
    achata = 1 + 0.1 * mola;
  }
  // a bolha fica a ~1,15 raio da boca, na direcao da mira
  const dir = { x: Math.cos(ang), y: -Math.sin(ang) };
  const bocaTela = { x: P.x - dir.x * k * 1.25, y: P.y - dir.y * k * 1.25 + k * 0.15 };
  if (im) {
    const w = d * 3.1;
    const h = w * (im.height / im.width);
    g.save();
    g.translate(bocaTela.x, bocaTela.y + Math.sin(t * 2.4) * d * 0.03);
    if (esquerda) g.scale(-1, 1);
    g.rotate(-(incl - Math.PI / 4) * 0.35);
    g.scale(escala * achata, escala / achata);
    g.drawImage(im, -boca.x * w, -boca.y * h, w, h);
    g.restore();
  }
  // a perola da vez: chega da concha em arco (ou troca com a da concha) e boia dentro de uma bolha
  const concha = naTela(L, CONCHA.x, CONCHA.y - 0.12);
  let pa = { x: P.x, y: P.y + Math.sin(t * 3.1) * k * 0.1 };
  let pc = concha;
  let tamC = 1;
  if (ca.troca < 1) {
    const f = ca.troca * ca.troca * (3 - 2 * ca.troca);
    pa = arco(concha, pa, f, k * 2.4);
    pc = arco(P, concha, f, k * 1.2);
  } else if (ca.carga < 1) {
    const f = ca.carga * ca.carga * (3 - 2 * ca.carga);
    pa = arco(concha, pa, f, k * 2.4);
    tamC = f;
  }
  if (ca.carga >= 1 || ca.troca < 1) {
    const bolha = IMG.bolha;
    const wob = 1 + Math.sin(t * 5.3) * 0.04;
    const db = d * 1.42;
    if (bolha && !j.voo) {
      g.globalAlpha = 0.55;
      g.drawImage(bolha, pa.x - (db * wob) / 2, pa.y - db / wob / 2, db * wob, db / wob);
      g.globalAlpha = 1;
    }
  }
  perola(g, j.atual, pa.x, pa.y, d * 1.02, 1 + Math.sin(t * 5.3) * 0.03, 1 - Math.sin(t * 5.3) * 0.03);
  // concha da proxima
  const conchaIm = IMG.concha;
  const cc = naTela(L, CONCHA.x, CONCHA.y);
  if (conchaIm) g.drawImage(conchaIm, cc.x - d * 0.95, cc.y - d * 0.55, d * 1.9, d * 1.9 * (conchaIm.height / conchaIm.width));
  if (tamC > 0.02) perola(g, j.proxima, pc.x, pc.y, d * 0.86 * tamC);
}

/**
 * @param {CanvasRenderingContext2D} g @param {import('../jogo/partida.js').Partida} pt @param {Layout} L
 * @param {ReturnType<typeof criarEfeitos>} fx @param {any} o
 */
function hud(g, pt, L, fx, o) {
  const j = pt.jogador;
  const esc = L.retrato ? Math.min(1.25, Math.max(0.8, L.W / 420)) : Math.min(1.25, Math.max(0.72, L.H / 640));
  if (pt.modo === 'copa' && pt.rival) {
    const rv = pt.rival;
    const resta = Math.max(0, (pt.cfg.duracao || 0) - pt.t);
    // jogador
    const xj = L.retrato ? 70 * esc : L.lados.esq.x + L.lados.esq.w / 2;
    const yj = L.retrato ? 30 * esc : L.lados.esq.y + 70 * esc;
    const lider = j.pontos >= rv.pontos;
    texto(g, o.voce, xj, yj - 14 * esc, 15 * esc, '#bff6f1', L.retrato ? 'left' : 'center');
    texto(g, milhar(j.pontos), xj, yj + 12 * esc, 30 * esc, lider ? '#ffd23f' : '#ffffff', L.retrato ? 'left' : 'center');
    // relogio
    const xr = L.retrato ? L.W / 2 : xj;
    const yr = L.retrato ? 40 * esc : yj + 110 * esc;
    const raio = 27 * esc;
    g.beginPath();
    g.arc(xr, yr, raio, 0, Math.PI * 2);
    g.fillStyle = 'rgba(11, 37, 69, 0.75)';
    g.fill();
    const fr = (pt.cfg.duracao ? resta / pt.cfg.duracao : 1);
    g.beginPath();
    g.arc(xr, yr, raio - 4 * esc, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fr);
    g.lineWidth = 6 * esc;
    g.strokeStyle = resta <= 10 ? '#ff5a4e' : '#7fe7e0';
    g.stroke();
    const seg = Math.ceil(resta);
    const pulso = resta <= 10 && o.relogioLigado ? 1 + 0.12 * Math.abs(Math.sin(o.t * Math.PI)) : 1;
    texto(g, `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`, xr, yr + 1, 17 * esc * pulso, resta <= 10 ? '#ffb4ab' : '#fff');
    // painel do rival
    const pw = 172 * esc;
    const ph = 64 * esc;
    const px = L.retrato ? L.W - pw - 8 : L.lados.dir.x + Math.max(0, (L.lados.dir.w - pw) / 2);
    const py = L.retrato ? 8 * esc : L.lados.dir.y + 4;
    g.fillStyle = 'rgba(11, 37, 69, 0.78)';
    rrect(g, px, py, pw, ph, 14 * esc);
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = !lider ? '#ffd23f' : 'rgba(127, 231, 224, 0.6)';
    g.stroke();
    const rim = o.rival && IMG[`rival-${o.rival.id}`];
    const rs = ph - 10 * esc;
    if (rim) {
      const asp = rim.height / rim.width;
      const w = asp > 1 ? rs / asp : rs;
      const h = asp > 1 ? rs : rs * asp;
      const quica = o.segurando ? 0 : Math.abs(Math.sin(o.t * 2)) * 2 * esc;
      g.drawImage(rim, px + 5 * esc + (rs - w) / 2, py + 5 * esc + (rs - h) / 2 - quica, w, h);
    }
    // nome cabe entre o rosto e o mini-tabuleiro (encolhe se for longo)
    const nome = o.rival ? o.rival.nome : '';
    const livre = pw - rs - 12 * esc - 46 * esc - 14 * esc;
    g.font = `700 ${Math.round(13 * esc)}px ${FONTE}`;
    const largNome = g.measureText(nome).width;
    texto(g, nome, px + rs + 12 * esc, py + 18 * esc, 13 * esc * Math.min(1, livre / Math.max(1, largNome)), '#bff6f1', 'left');
    texto(g, milhar(rv.pontos), px + rs + 12 * esc, py + 42 * esc, 22 * esc, !lider ? '#ffd23f' : '#fff', 'left');
    // mini tabuleiro do rival (o mesmo recife, jogado por ele)
    const mw = 46 * esc;
    const mk = mw / LARG;
    const mx = px + pw - mw - 6 * esc;
    const my = py + 6 * esc;
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(mx, my, mw, (LIMITE * ALT + 2) * mk);
    cada(rv.grade, (p, r, c) => {
      const pos = posicao(rv.grade, r, c);
      g.fillStyle = p.tipo === 'n' ? HEX[p.cor] : p.tipo === 'pedra' ? '#9aa' : '#cfefff';
      g.fillRect(mx + (pos.x - 1) * mk, my + (pos.y - 1) * mk, 2 * mk, 2 * mk);
    });
    for (const p of fx.lista) {
      if (p.tipo !== 'rival') continue;
      g.globalAlpha = p.vida / p.max;
      texto(g, p.txt || '', px + rs + 70 * esc, py + 42 * esc + (1 - p.vida / p.max) * -26 * esc, 15 * esc, '#7fe7e0', 'left');
      g.globalAlpha = 1;
    }
  } else {
    // aventura e desafio: fase, objetivo, pontos
    const xa = L.retrato ? 70 * esc : L.lados.esq.x + L.lados.esq.w / 2;
    const ya = L.retrato ? 26 * esc : L.lados.esq.y + 60 * esc;
    texto(g, o.rotuloFase, xa, ya, 18 * esc, '#bff6f1', L.retrato ? 'left' : 'center');
    texto(g, milhar(j.pontos), xa, ya + 28 * esc, 26 * esc, '#fff', L.retrato ? 'left' : 'center');
    const xo = L.retrato ? L.W - 12 : L.lados.dir.x + L.lados.dir.w / 2;
    const yo = L.retrato ? 28 * esc : L.lados.dir.y + 60 * esc;
    const ob = pt.cfg.objetivo;
    if (ob && ob.tipo === 'peixes') {
      const im = IMG['peixe-1'];
      const s = 34 * esc;
      const resta = peixesNoTabuleiro(j.grade);
      const xi = L.retrato ? xo - 64 * esc : xo - 34 * esc;
      if (im) g.drawImage(im, xi - s / 2, yo - s / 2, s, s);
      texto(g, `× ${resta}`, xi + 22 * esc, yo, 22 * esc, '#fff', 'left');
    } else if (ob && ob.tipo === 'pontos') {
      const meta = ob.n || 1;
      const w = 120 * esc;
      const x0 = L.retrato ? xo - w : xo - w / 2;
      g.fillStyle = 'rgba(11,37,69,0.75)';
      rrect(g, x0, yo - 9 * esc, w, 18 * esc, 9 * esc);
      g.fill();
      g.fillStyle = '#ffd23f';
      rrect(g, x0 + 2, yo - 7 * esc, Math.max(4, (w - 4) * Math.min(1, j.pontos / meta)), 14 * esc, 7 * esc);
      g.fill();
      texto(g, milhar(meta), x0 + w / 2, yo + 22 * esc, 14 * esc, '#fff');
    }
    texto(g, o.objetivo, xo, yo + (ob && ob.tipo === 'pontos' ? 44 : 30) * esc, 13 * esc, '#bff6f1', L.retrato ? 'right' : 'center');
  }
}

/** Desenho so do fundo (menus). @param {CanvasRenderingContext2D} g @param {number} W @param {number} H @param {string} nome @param {number} t */
export function desenharMenu(g, W, H, nome, t) {
  desenharFundo(g, W, H, nome);
  const b = IMG.bolha;
  if (!b) return;
  for (let i = 0; i < 9; i++) {
    const x = ((i * 137) % 100) / 100 * W;
    const y = H - (((t * (20 + i * 4) + i * 90) % (H + 60)));
    const s = 10 + (i % 4) * 6;
    g.globalAlpha = 0.5;
    g.drawImage(b, x - s / 2, y - s / 2, s, s);
  }
  g.globalAlpha = 1;
}

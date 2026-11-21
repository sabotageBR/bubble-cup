// IA de mira: prova varios angulos com a perola da vez (e a proxima, trocando), simula o caminho e o
// resultado numa copia da grade e escolhe. O rival da copa usa isto com ruido de mira, chance de escolher
// a melhor e um intervalo entre tiros, todos pela habilidade (1 a 10). A ajuda do jogador e o bot de testes
// usam a mesma funcao. Puro.
import { criarRng } from '../core/rng.js';
import { clonar, vizinhos, ler, combina } from './grade.js';
import { simular, ANG_MIN, ANG_MAX, limitarAngulo } from './tiro.js';
import { aplicarTiro, pontosTiro } from './regras.js';
import { atirar, trocar } from './partida.js';

/** Angulos provados por perola. */
export const AMOSTRAS = 56;

/**
 * @typedef {{ ang: number, trocar: boolean, valor: number, casa: [number, number], pontos: number, caidas: number }} Opcao
 */

/**
 * Valor de pousar `perola` com o angulo `ang`.
 * @param {import('./grade.js').Grade} g @param {import('./grade.js').Perola} perola @param {number} ang
 */
export function avaliar(g, perola, ang) {
  const traj = simular(g, ang);
  const copia = clonar(g);
  const res = aplicarTiro(copia, traj.casa, perola);
  const pontos = res.acertou ? pontosTiro(res.estouradas.length, res.caidas.length, 1, res.peixes) : 0;
  let valor = pontos;
  if (!res.acertou) {
    // sem estouro: vale encostar na mesma cor (monta grupo) e ficar no alto
    let iguais = 0;
    for (const [a, b] of vizinhos(g, traj.casa[0], traj.casa[1])) {
      const v = ler(g, a, b);
      if (combina(v) && v && v.cor === perola.cor) iguais++;
    }
    valor = iguais * 6 - traj.casa[0] * 0.8;
  }
  return { valor, casa: traj.casa, pontos, caidas: res.caidas.length };
}

/**
 * Todas as opcoes avaliadas (melhor primeiro), sem repetir a mesma casa com a mesma perola.
 * @param {import('./grade.js').Grade} g
 * @param {import('./grade.js').Perola} atual
 * @param {import('./grade.js').Perola} [proxima] provar tambem trocando
 * @returns {Opcao[]}
 */
export function opcoes(g, atual, proxima) {
  /** @type {Opcao[]} */
  const lista = [];
  const provar = (perola, trocou) => {
    // angulos em ordem: cada casa guarda a maior faixa CONTINUA de angulos que pousa nela (direto e com
    // ricochete sao faixas diferentes) e mira no meio dela, a folga maior contra o ruido
    /** @type {Map<string, any>} */
    const porCasa = new Map();
    let corrida = null;
    const fechar = () => {
      if (!corrida) return;
      const atual2 = porCasa.get(corrida.k);
      if (!atual2 || corrida.n > atual2.n) porCasa.set(corrida.k, corrida);
    };
    for (let i = 0; i < AMOSTRAS; i++) {
      const ang = ANG_MIN + ((ANG_MAX - ANG_MIN) * (i + 0.5)) / AMOSTRAS;
      const a = avaliar(g, perola, ang);
      const k = `${a.casa[0]}:${a.casa[1]}`;
      if (corrida && corrida.k === k) {
        corrida.n++;
        corrida.fim = ang;
        continue;
      }
      fechar();
      corrida = { k, n: 1, ini: ang, fim: ang, a };
    }
    fechar();
    for (const c of porCasa.values()) {
      lista.push(/** @type {any} */ ({ ...c.a, ang: (c.ini + c.fim) / 2, trocar: trocou, n: c.n }));
    }
  };
  provar(atual, false);
  if (proxima && (proxima.tipo !== atual.tipo || proxima.cor !== atual.cor)) provar(proxima, true);
  // desempate: mesma nota, a faixa mais larga primeiro
  return lista.sort((a, b) => b.valor - a.valor || /** @type {any} */ (b).n - /** @type {any} */ (a).n);
}

/**
 * Melhor tiro para a perola da vez (ajuda do jogador, bot).
 * @param {import('./partida.js').Lado} lado @param {boolean} [comTroca]
 * @returns {Opcao|null}
 */
export function melhorTiro(lado, comTroca = false) {
  const l = opcoes(lado.grade, lado.atual, comTroca ? lado.proxima : undefined);
  return l[0] || null;
}

/** Parametros pela habilidade (1 a 10). @param {number} hab */
export function perfil(hab) {
  const h = Math.max(0.5, Math.min(10.6, hab));
  return {
    hab: h,
    intervalo: 3.4 - 0.22 * h,
    ruido: 0.09 - 0.008 * h,
    acerto: 0.35 + 0.065 * h,
    troca: h >= 3,
  };
}

/**
 * Estado da IA do rival.
 * @param {number} hab @param {number} semente
 */
export function criarIA(hab, semente) {
  const rng = criarRng((semente * 2654435761) >>> 0);
  const p = perfil(hab);
  return { ...p, rng, espera: 1.2 + rng() * 0.8, segurando: false };
}

/** Normal padrao (Box-Muller) pela rng. @param {() => number} rng */
function gauss(rng) {
  const u = Math.max(1e-9, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Escolhe o tiro do rival (com erro humano).
 * @param {ReturnType<typeof criarIA>} ia @param {import('./partida.js').Lado} lado
 */
export function decidir(ia, lado) {
  const l = opcoes(lado.grade, lado.atual, ia.troca ? lado.proxima : undefined);
  if (!l.length) return { ang: Math.PI / 2, trocar: false };
  let o = l[0];
  if (ia.rng() > ia.acerto) o = l[Math.min(l.length - 1, 1 + Math.floor(ia.rng() * 5))];
  return { ang: limitarAngulo(o.ang + gauss(ia.rng) * ia.ruido), trocar: o.trocar };
}

/**
 * Passo da IA dentro da partida (passado para partida.passo).
 * @param {import('./partida.js').Partida} pt @param {number} dt
 */
export function passoIA(pt, dt) {
  const ia = pt.ia;
  const lado = pt.rival;
  if (!ia || !lado || lado.voo) return;
  ia.espera -= dt;
  if (ia.espera > 0) return;
  // ensino: o rival fica abaixo de 85% dos pontos do jogador; so atira o que nao passa desse teto
  if (pt.cfg.segurar) {
    const teto = pt.jogador.pontos * 0.85 - 40;
    const cabe = lado.pontos <= teto ? opcoes(lado.grade, lado.atual).filter((o) => lado.pontos + o.pontos * 1.7 <= teto) : [];
    if (!cabe.length) {
      ia.segurando = true;
      ia.espera = 0.6;
      return;
    }
    ia.segurando = false;
    const o = ia.rng() < ia.acerto ? cabe[0] : cabe[Math.floor(ia.rng() * Math.min(5, cabe.length))];
    atirar(pt, lado, limitarAngulo(o.ang + gauss(ia.rng) * ia.ruido * 0.5));
    ia.espera = ia.intervalo * (0.75 + 0.5 * ia.rng());
    return;
  }
  ia.segurando = false;
  const d = decidir(ia, lado);
  if (d.trocar) trocar(lado);
  atirar(pt, lado, d.ang);
  ia.espera = ia.intervalo * (0.75 + 0.5 * ia.rng());
}

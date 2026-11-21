#!/usr/bin/env node
// Bot de testes do Bubble Cup: joga partidas da copa (jogador-bot contra os rivais de cada liga) e as fases
// da aventura, e mede pontos, vitorias, tiros e duracao. Os perfis de jogador imitam um humano que ve a
// linha de mira (pouco ruido) mas pensa entre os tiros.
// Uso: node tools/bot.mjs [--partidas=6] [--tentativas=8] [--so=copa|aventura|sessao]
import { criarPartida, atirar, trocar, passo, tirosRestantes, darTiros, encerrarDerrota } from '../src/jogo/partida.js';
import { criarIA, passoIA, decidir } from '../src/jogo/rival.js';
import { criarCopa, adversario, configPartida, registrar, sementeRodada, RIVAIS, LIGAS, colocacao, habEfetiva } from '../src/jogo/copa.js';
import { fase, FASES, FASES_SEM_DERROTA } from '../src/jogo/aventura.js';
import { criarRng } from '../src/core/rng.js';

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split('=')[1] : d;
};
const PARTIDAS = Number(arg('partidas', 6));
const TENTATIVAS = Number(arg('tentativas', 8));
const SO = arg('so', '');

/** Perfis de jogador (s entre tiros, ruido de mira, chance de escolher a melhor). */
export const PERFIS = {
  novato: { intervalo: 2.6, ruido: 0.03, acerto: 0.45, troca: false },
  medio: { intervalo: 1.9, ruido: 0.015, acerto: 0.7, troca: true },
  bom: { intervalo: 1.3, ruido: 0.008, acerto: 0.9, troca: true },
};

function jogadorBot(perfil, semente) {
  return { ...perfil, hab: 0, rng: criarRng(semente), espera: 1.5, segurando: false };
}

/** Passo do jogador-bot: mesma decisao da IA do rival, outro perfil. */
function passoJogador(pt, bot, dt) {
  const lado = pt.jogador;
  if (lado.voo || pt.fim) return;
  bot.espera -= dt;
  if (bot.espera > 0) return;
  const d = decidir(bot, lado);
  if (d.trocar) trocar(lado);
  atirar(pt, lado, d.ang);
  bot.espera = bot.intervalo * (0.7 + 0.6 * bot.rng());
}

/** Uma partida da copa. @returns {{ venceu: boolean, pj: number, pr: number, s: number }} */
export function jogarPartidaCopa(c, perfil, semente) {
  const cfg = configPartida(c);
  const r = adversario(c);
  const pt = criarPartida('copa', sementeRodada(c), cfg, criarIA(habEfetiva(c, r), sementeRodada(c)));
  const bot = jogadorBot(perfil, semente);
  let s = 0;
  while (!pt.fim && s < 200) {
    passoJogador(pt, bot, 1 / 60);
    passo(pt, 1 / 60, passoIA);
    s += 1 / 60;
  }
  return { venceu: !!pt.resultado?.venceu, pj: pt.jogador.pontos, pr: pt.rival?.pontos || 0, s };
}

/** Uma copa inteira. */
export function jogarCopa(liga, perfil, semente, ensino = false) {
  const c = criarCopa({ liga, semente, ensino });
  const partidas = [];
  while (c.rodada < 3 && !c.eliminado) {
    const p = jogarPartidaCopa(c, perfil, semente * 7 + c.rodada);
    partidas.push({ rival: RIVAIS[adversario(c)].id, ...p });
    registrar(c, p.venceu, p.pj, p.pr);
  }
  return { col: colocacao(c), partidas };
}

/** Uma fase da aventura. */
export function jogarFase(n, perfil, semente, dia) {
  const f = dia !== undefined ? fase(n, { dia }) : fase(n);
  const pt = criarPartida('aventura', 1000 + n, f.cfg);
  const bot = jogadorBot(perfil, semente);
  let s = 0;
  let extras = 0;
  while (!pt.fim && s < 900) {
    if (pt.semTiros) {
      if (n <= FASES_SEM_DERROTA && extras < 3) { darTiros(pt, 5); extras++; } else { encerrarDerrota(pt); break; }
    }
    passoJogador(pt, bot, 1 / 60);
    passo(pt, 1 / 60);
    s += 1 / 60;
  }
  return { venceu: !!pt.resultado?.venceu, tiros: pt.jogador.tiros, limite: f.cfg.tiros, s, estrelas: pt.resultado?.estrelas || 0, extras };
}

const pct = (x) => `${Math.round(x * 100)}%`;
const media = (l, f) => l.reduce((a, x) => a + f(x), 0) / Math.max(1, l.length);

if (process.argv[1] && process.argv[1].endsWith('bot.mjs')) {
  if (!SO || SO === 'sessao') {
    console.log('== Primeira sessao (copa de ensino, jogador novato e medio)');
    for (const nome of ['novato', 'medio']) {
      const r = jogarCopa(0, PERFIS[nome], 11, true);
      const tempo = r.partidas.reduce((a, p) => a + p.s, 0) + r.partidas.length * 8;
      console.log(`${nome.padEnd(7)} ${r.col.padEnd(8)} ${r.partidas.map((p) => `${p.rival} ${p.pj}x${p.pr}`).join(' | ')}  ~${(tempo / 60).toFixed(1)} min`);
    }
  }
  if (!SO || SO === 'copa') {
    console.log(`\n== Copa por liga (${PARTIDAS} copas por perfil)`);
    for (let liga = 0; liga < LIGAS.length; liga++) {
      for (const nome of ['novato', 'medio', 'bom']) {
        const cs = Array.from({ length: PARTIDAS }, (_, k) => jogarCopa(liga, PERFIS[nome], 500 + k * 13 + liga));
        const todas = cs.flatMap((c) => c.partidas);
        const cont = (col) => cs.filter((c) => c.col === col).length;
        console.log(`${LIGAS[liga].id.padEnd(8)} ${nome.padEnd(7)} campeao ${pct(cont('campeao') / PARTIDAS).padStart(4)} vice ${pct(cont('vice') / PARTIDAS).padStart(4)} | partidas ganhas ${pct(media(todas, (p) => (p.venceu ? 1 : 0)))} | pontos ${Math.round(media(todas, (p) => p.pj))} x rival ${Math.round(media(todas, (p) => p.pr))}`);
      }
    }
  }
  if (!SO || SO === 'aventura') {
    console.log(`\n== Aventura (${TENTATIVAS} tentativas por fase; s = segundos de jogo do bot)`);
    let total = 0;
    for (let n = 1; n <= FASES; n++) {
      const linha = [];
      for (const nome of ['novato', 'medio']) {
        const ts = Array.from({ length: TENTATIVAS }, (_, k) => jogarFase(n, PERFIS[nome], 900 + k * 31 + n));
        const pass = media(ts, (t) => (t.venceu ? 1 : 0));
        if (nome === 'medio') total += media(ts, (t) => t.s);
        linha.push(`${nome} ${pct(pass).padStart(4)} ${Math.round(media(ts, (t) => t.tiros))}/${ts[0].limite} ${Math.round(media(ts, (t) => t.s))}s *${media(ts, (t) => t.estrelas).toFixed(1)}`);
      }
      const f = fase(n);
      console.log(`fase ${String(n).padStart(2)} ${f.cfg.objetivo?.tipo.padEnd(7)} ${linha.join(' | ')}`);
    }
    console.log(`aventura inteira (medio): ~${(total / 60).toFixed(0)} min`);
  }
}

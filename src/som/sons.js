// Sons do Bubble Cup, sintetizados (src/som/receitas.js): bolhas, o pop do estouro, o mergulho da queda,
// bomba, gelo, peixinho, fileira nova, aviso do relogio e as fanfarras. Contrato: (v, t0, p) => duracao em s.
// Regra (pedido do usuario em 2026-11-20): nada de cliques rapidos em sequencia ("catraca", tique-taque,
// contagem): cada acerto e UM som; acordes tocam as notas juntas.
import { tom, sopro, hz } from './receitas.js';

export const SONS = {
  /** perola saindo do canhao: "blup" de bolha */
  tiro(v, t0) {
    sopro(v, t0, { f: 900, f2: 2400, q: 2, vol: 0.05, ataque: 0.002, queda: 0.09 });
    return tom(v, t0, { f: 260, f2: 620, vol: 0.12, ataque: 0.003, queda: 0.11, tipo: 'sine' }) - t0;
  },
  /** encostou sem estourar */
  gruda(v, t0) {
    return tom(v, t0, { f: 520, f2: 380, vol: 0.07, ataque: 0.002, queda: 0.06, tipo: 'triangle' }) - t0;
  },
  /**
   * Estouro do grupo: UM pop de bolha, limpo (seno que desce rapido + um sopro curto e abafado), mais grave
   * quanto maior o grupo e mais agudo com o combo. Nada de varios cliques em sequencia (soava como catraca).
   */
  estouro(v, t0, p) {
    const k = Math.min(8, (p && p.combo) || 1);
    const n = Math.min(12, (p && p.n) || 3);
    const base = hz(76 + k * 1.5 - Math.min(5, n - 3));
    sopro(v, t0, { f: 1500, f2: 500, q: 0.7, vol: 0.045, ataque: 0.002, queda: 0.07, filtro: 'lowpass' });
    tom(v, t0, { f: base * 2.2, f2: base * 0.9, glide: 0.06, vol: 0.11, ataque: 0.002, queda: 0.12, tipo: 'sine' });
    return tom(v, t0 + 0.012, { f: base, f2: base * 1.5, glide: 0.08, vol: 0.06, ataque: 0.004, queda: 0.18, tipo: 'sine' }) - t0;
  },
  /** Queda: um mergulho de agua e um acorde so (as notas juntas, nunca uma a uma) */
  queda(v, t0, p) {
    const n = Math.min(30, (p && p.n) || 4);
    const vol = 0.04 + Math.min(0.05, n * 0.003);
    sopro(v, t0, { f: 900, f2: 220, q: 0.6, vol: vol * 1.4, ataque: 0.03, queda: 0.45, filtro: 'lowpass' });
    let fim = t0;
    for (const m of n >= 10 ? [72, 76, 79, 84] : [72, 76, 79]) {
      fim = tom(v, t0 + 0.05, { f: hz(m), vol, ataque: 0.03, segurar: 0.08, queda: 0.7, tipo: 'sine', vib: { f: 5, prof: 2 } });
    }
    return fim - t0;
  },
  bomba(v, t0) {
    sopro(v, t0, { f: 400, f2: 80, q: 0.7, vol: 0.28, ataque: 0.004, queda: 0.5, filtro: 'lowpass' });
    return tom(v, t0, { f: 120, f2: 40, vol: 0.25, ataque: 0.004, queda: 0.45, tipo: 'sine' }) - t0;
  },
  /** arco-iris: acorde brilhante com vibrato (notas juntas) */
  arco(v, t0) {
    let fim = t0;
    for (const m of [79, 83, 88]) fim = tom(v, t0, { f: hz(m), vol: 0.045, ataque: 0.02, queda: 0.4, tipo: 'sine', vib: { f: 7, prof: 5 } });
    return fim - t0;
  },
  gelo(v, t0) {
    sopro(v, t0, { f: 5200, q: 4, vol: 0.09, ataque: 0.001, queda: 0.07 });
    return tom(v, t0 + 0.02, { f: 2400, f2: 1800, vol: 0.04, ataque: 0.001, queda: 0.06, tipo: 'square' }) - t0;
  },
  peixe(v, t0) {
    tom(v, t0, { f: 700, f2: 1300, vol: 0.07, ataque: 0.003, queda: 0.12, tipo: 'sine' });
    return tom(v, t0 + 0.09, { f: 900, f2: 1600, vol: 0.06, ataque: 0.003, queda: 0.12, tipo: 'sine' }) - t0;
  },
  linha(v, t0) {
    sopro(v, t0, { f: 300, f2: 160, q: 0.8, vol: 0.12, ataque: 0.02, queda: 0.35, filtro: 'lowpass' });
    return tom(v, t0, { f: 98, f2: 73, vol: 0.12, ataque: 0.01, queda: 0.3, tipo: 'triangle' }) - t0;
  },
  transbordo(v, t0) {
    sopro(v, t0, { f: 1200, f2: 300, q: 0.6, vol: 0.2, ataque: 0.01, queda: 0.7 });
    return tom(v, t0, { f: 330, f2: 165, vol: 0.1, ataque: 0.01, queda: 0.5, tipo: 'square', filtro: { f: 900 } }) - t0;
  },
  troca(v, t0) {
    return tom(v, t0, { f: 660, f2: 880, vol: 0.06, ataque: 0.002, queda: 0.06, tipo: 'triangle' }) - t0;
  },
  /** faltam 10 s: um sino so (sem tique-taque a cada segundo) */
  aviso(v, t0) {
    tom(v, t0, { f: hz(81), vol: 0.06, ataque: 0.005, queda: 0.6, tipo: 'sine' });
    return tom(v, t0, { f: hz(88), vol: 0.03, ataque: 0.005, queda: 0.5, tipo: 'sine' }) - t0;
  },
  clique(v, t0) {
    return tom(v, t0, { f: 880, f2: 660, vol: 0.05, ataque: 0.001, queda: 0.05, tipo: 'triangle' }) - t0;
  },
  /** comeco de partida: "versus" */
  versus(v, t0) {
    tom(v, t0, { f: hz(55), vol: 0.12, ataque: 0.005, queda: 0.25, tipo: 'triangle' });
    return tom(v, t0 + 0.16, { f: hz(62), vol: 0.12, ataque: 0.005, queda: 0.35, tipo: 'triangle' }) - t0;
  },
  festa(v, t0) {
    let fim = t0;
    for (const m of [72, 76, 79]) fim = tom(v, t0, { f: hz(m), vol: 0.07, ataque: 0.02, queda: 0.5, tipo: 'sine' });
    fim = tom(v, t0 + 0.16, { f: hz(84), vol: 0.08, ataque: 0.02, queda: 0.6, tipo: 'sine' });
    return fim - t0;
  },
  vitoria(v, t0) {
    let fim = t0;
    [[72, 0], [76, 0.1], [79, 0.2], [84, 0.32], [79, 0.5], [84, 0.6]].forEach(([m, d]) => {
      fim = tom(v, t0 + d, { f: hz(m), vol: 0.09, ataque: 0.02, queda: 0.42, tipo: 'sine' });
      tom(v, t0 + d, { f: hz(m - 12), vol: 0.05, ataque: 0.02, queda: 0.42, tipo: 'sine' });
    });
    return fim - t0;
  },
  derrota(v, t0) {
    let fim = t0;
    [[67, 0], [64, 0.18], [60, 0.36]].forEach(([m, d]) => { fim = tom(v, t0 + d, { f: hz(m), vol: 0.08, ataque: 0.01, queda: 0.35, tipo: 'sine' }); });
    return fim - t0;
  },
};

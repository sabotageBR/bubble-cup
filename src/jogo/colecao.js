// Meta longa: estatisticas do jogador, os 24 trofeus da sala, as 9 skins de canhao e o que falta para a
// proxima. Puro: recebe e devolve objetos simples (o main salva).

/**
 * @typedef {object} Stats
 * @property {Record<string, number>} copas      copas vencidas por liga (bronze, prata, ouro, diamante)
 * @property {number} semanas                    copas da semana vencidas
 * @property {number} ligaMax                    maior liga alcancada (0..3)
 * @property {number} fases                      fases da aventura vencidas (a maior)
 * @property {number} estrelas3                  fases com 3 estrelas
 * @property {number} quedaMax
 * @property {number} limpos                     recifes limpos na copa
 * @property {number} comboMax
 * @property {number} dobro                      vitorias com o dobro dos pontos do rival
 * @property {number} carimbos                   desafios do dia vencidos
 * @property {number} perolas                    perolas estouradas (total)
 * @property {number} peixes                     peixinhos soltos (total)
 * @property {number} vitoriasTuba
 */

/** @returns {Stats} */
export function statsVazias() {
  return { copas: { bronze: 0, prata: 0, ouro: 0, diamante: 0 }, semanas: 0, ligaMax: 0, fases: 0, estrelas3: 0, quedaMax: 0, limpos: 0, comboMax: 0, dobro: 0, carimbos: 0, perolas: 0, peixes: 0, vitoriasTuba: 0 };
}

/** @param {Stats} s */
const totalCopas = (s) => Object.values(s.copas).reduce((a, b) => a + b, 0);

/**
 * arte = arquivo em src/arte (sem .webp); meta = valor alvo para a barra de progresso.
 * @type {{ id: string, arte: string, valor: (s: Stats) => number, meta: number }[]}
 */
export const TROFEUS = [
  { id: 'copa-bronze', arte: 'trofeu-taca-bronze', valor: (s) => s.copas.bronze, meta: 1 },
  { id: 'copa-prata', arte: 'trofeu-taca-prata', valor: (s) => s.copas.prata, meta: 1 },
  { id: 'copa-ouro', arte: 'trofeu-taca-ouro', valor: (s) => s.copas.ouro, meta: 1 },
  { id: 'copa-diamante', arte: 'trofeu-taca-diamante', valor: (s) => s.copas.diamante, meta: 1 },
  { id: 'semana', arte: 'trofeu-taca-coral', valor: (s) => s.semanas, meta: 1 },
  { id: 'liga-prata', arte: 'emblema-prata', valor: (s) => (s.ligaMax >= 1 ? 1 : 0), meta: 1 },
  { id: 'liga-ouro', arte: 'emblema-ouro', valor: (s) => (s.ligaMax >= 2 ? 1 : 0), meta: 1 },
  { id: 'liga-diamante', arte: 'emblema-diamante', valor: (s) => (s.ligaMax >= 3 ? 1 : 0), meta: 1 },
  { id: 'recife-1', arte: 'mapa', valor: (s) => s.fases, meta: 8 },
  { id: 'recife-2', arte: 'trofeu-ancora', valor: (s) => s.fases, meta: 16 },
  { id: 'recife-3', arte: 'bau', valor: (s) => s.fases, meta: 24 },
  { id: 'recife-4', arte: 'trofeu-tridente', valor: (s) => s.fases, meta: 32 },
  { id: 'queda-15', arte: 'trofeu-medalha', valor: (s) => s.quedaMax, meta: 15 },
  { id: 'queda-30', arte: 'trofeu-medalha', valor: (s) => s.quedaMax, meta: 30 },
  { id: 'limpo', arte: 'trofeu-perola-grande', valor: (s) => s.limpos, meta: 1 },
  { id: 'combo-6', arte: 'estrela', valor: (s) => s.comboMax, meta: 6 },
  { id: 'dobro', arte: 'trofeu-taca-ouro', valor: (s) => s.dobro, meta: 1 },
  { id: 'carimbos-7', arte: 'concha', valor: (s) => s.carimbos, meta: 7 },
  { id: 'perolas-1000', arte: 'perola-arco', valor: (s) => s.perolas, meta: 1000 },
  { id: 'perolas-5000', arte: 'perola-arco', valor: (s) => s.perolas, meta: 5000 },
  { id: 'peixes-50', arte: 'peixe-1', valor: (s) => s.peixes, meta: 50 },
  { id: 'estrelas-10', arte: 'estrela', valor: (s) => s.estrelas3, meta: 10 },
  { id: 'copas-10', arte: 'trofeu-taca-diamante', valor: totalCopas, meta: 10 },
  { id: 'tuba', arte: 'rival-tuba', valor: (s) => s.vitoriasTuba, meta: 1 },
];

/** @param {Stats} s @returns {string[]} ids conquistados */
export function conquistados(s) {
  return TROFEUS.filter((t) => t.valor(s) >= t.meta).map((t) => t.id);
}

/** Skins de canhao e o marco que libera cada uma. */
export const SKINS = [
  { id: 'baiacu', libera: () => true },
  { id: 'polvo', libera: (/** @type {Stats} */ s) => totalCopas(s) >= 1 },
  { id: 'tartaruga', libera: (/** @type {Stats} */ s) => s.ligaMax >= 1 },
  { id: 'caranguejo', libera: (/** @type {Stats} */ s) => s.fases >= 10 },
  { id: 'lula', libera: (/** @type {Stats} */ s) => s.ligaMax >= 2 },
  { id: 'lanterna', libera: (/** @type {Stats} */ s) => s.semanas >= 1 },
  { id: 'narval', libera: (/** @type {Stats} */ s) => s.ligaMax >= 3 },
  { id: 'foca', libera: (/** @type {Stats} */ s) => conquistados(s).length >= 12 },
  { id: 'axolote', libera: (/** @type {Stats} */ s) => conquistados(s).length >= 20 },
];

/** @param {Stats} s @returns {string[]} */
export function skinsLiberadas(s) {
  return SKINS.filter((k) => k.libera(s)).map((k) => k.id);
}

/**
 * Soma uma partida/fase nas estatisticas.
 * @param {Stats} s
 * @param {{ estouradas?: number, peixes?: number, quedaMax?: number, comboMax?: number, limpos?: number }} lado
 */
export function somarLado(s, lado) {
  s.perolas += lado.estouradas || 0;
  s.peixes += lado.peixes || 0;
  s.quedaMax = Math.max(s.quedaMax, lado.quedaMax || 0);
  s.comboMax = Math.max(s.comboMax, lado.comboMax || 0);
  s.limpos += lado.limpos || 0;
  return s;
}

/**
 * O que mudou de uma foto para outra (trofeus e skins novos), para a festa.
 * @param {string[]} trofeusAntes @param {string[]} skinsAntes @param {Stats} s
 */
export function novidades(trofeusAntes, skinsAntes, s) {
  return {
    trofeus: conquistados(s).filter((t) => !trofeusAntes.includes(t)),
    skins: skinsLiberadas(s).filter((k) => !skinsAntes.includes(k)),
  };
}

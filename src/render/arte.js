// Carrega a arte (WebP do Grok recortada em src/arte) com progresso, e prepara a peca derivada: o anel de
// gelo (o centro da perola congelada vazado, para pousar sobre qualquer cor). Mais a boca de cada canhao.

export const CORES_ARTE = ['perola-vermelho', 'perola-amarelo', 'perola-azul', 'perola-verde', 'perola-violeta', 'perola-laranja'];
export const SKINS_ARTE = ['baiacu', 'polvo', 'tartaruga', 'caranguejo', 'lula', 'lanterna', 'narval', 'foca', 'axolote'];
export const RIVAIS_ARTE = ['pingo', 'garra', 'mel', 'lulu', 'rabisco', 'tata', 'faisca', 'estrela', 'bigode', 'duda', 'sombra', 'tuba'];
export const FUNDOS = ['estadio', 'jardim', 'algas', 'navio', 'fossa'];

/** Arquivos que entram ja na primeira tela (o resto carrega em seguida, sem travar). */
const PRIMEIROS = [
  ...CORES_ARTE, 'perola-arco', 'perola-bomba', 'perola-pedra', 'perola-gelo', 'peixe-1', 'peixe-2', 'peixe-3',
  'brilho', 'respingo', 'bolha', 'concha', 'estrela', 'canhao-baiacu', 'rival-pingo', 'rival-mel', 'rival-garra',
];

/** @type {Record<string, HTMLImageElement|HTMLCanvasElement>} */
export const IMG = {};
/**
 * Boca de cada canhao (o "O" escuro do desenho), em fracao da largura e da altura do sprite: achada pela maior
 * bolha escura e redonda abaixo dos olhos (arte/recortes/canhoes-b) e conferida a olho; lula, foca e axolote
 * ajustados a mao. A perola da vez boia logo a frente desse ponto.
 */
export const BOCA = /** @type {Record<string, { x: number, y: number }>} */ ({
  baiacu: { x: 0.784, y: 0.533 }, polvo: { x: 0.707, y: 0.543 }, tartaruga: { x: 0.83, y: 0.475 },
  caranguejo: { x: 0.626, y: 0.596 }, lula: { x: 0.745, y: 0.615 }, lanterna: { x: 0.702, y: 0.68 },
  narval: { x: 0.823, y: 0.584 }, foca: { x: 0.8, y: 0.5 }, axolote: { x: 0.66, y: 0.556 },
});

/** @param {string} nome */
function carregar(nome) {
  return new Promise((ok) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { IMG[nome] = im; ok(true); };
    im.onerror = () => ok(false);
    im.src = `src/arte/${nome}.webp`;
  });
}

/** @param {boolean} retrato */
function listaFundos(retrato) {
  return FUNDOS.map((f) => `fundo-${f}-${retrato ? '9x16' : '16x9'}`);
}

/**
 * Carrega a primeira leva (com progresso) e devolve a promessa do resto.
 * @param {(f: number) => void} progresso
 * @param {boolean} retrato
 */
export async function carregarArte(progresso, retrato) {
  const primeira = [...PRIMEIROS, listaFundos(retrato)[0]];
  let feitos = 0;
  await Promise.all(primeira.map((n) => carregar(n).then(() => { feitos++; progresso(feitos / primeira.length); })));
  derivar();
  const resto = [
    ...listaFundos(retrato).slice(1), ...listaFundos(!retrato),
    ...SKINS_ARTE.map((s) => `canhao-${s}`), ...RIVAIS_ARTE.map((r) => `rival-${r}`),
    'trofeu-taca-bronze', 'trofeu-taca-prata', 'trofeu-taca-ouro', 'trofeu-taca-diamante', 'trofeu-taca-coral',
    'trofeu-medalha', 'trofeu-perola-grande', 'trofeu-ancora', 'trofeu-tridente',
    'emblema-bronze', 'emblema-prata', 'emblema-ouro', 'emblema-diamante', 'bau', 'mapa',
  ].filter((n) => !IMG[n]);
  const tudo = Promise.all(resto.map(carregar)).then(() => { derivar(); return true; });
  return { resto: tudo };
}

/** Anel de gelo (uma vez). */
function derivar() {
  const gelo = IMG['perola-gelo'];
  if (gelo && !IMG['anel-gelo']) {
    const c = document.createElement('canvas');
    c.width = gelo.width;
    c.height = gelo.height;
    const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    g.drawImage(gelo, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.arc(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.345, 0, Math.PI * 2);
    g.fill();
    IMG['anel-gelo'] = c;
  }
}

/** Fundo pelo nome e a orientacao (cai no que tiver). @param {string} nome @param {boolean} retrato */
export function fundo(nome, retrato) {
  return IMG[`fundo-${nome}-${retrato ? '9x16' : '16x9'}`] || IMG[`fundo-${nome}-${retrato ? '16x9' : '9x16'}`] || IMG['fundo-estadio-9x16'] || IMG['fundo-estadio-16x9'] || null;
}

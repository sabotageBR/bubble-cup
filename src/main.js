// Bubble Cup: montagem do jogo. O UNICO modulo que toca portal, DOM, audio e salvamento
// (test/estilo.test.js). Ciclo do portal na ordem do kit multiportal (../distribuicao/kit/src/main.js):
//
//  1. ganchos do portal ANTES do init (anuncio cala o audio e congela o laco; mudo e pausa do portal);
//  2. portal.init() primeiro, sem nada pesado antes (o handshake do californiagames.io dura 1,5 s);
//  3. carregar a arte com gameLoadingProgress; o laco so comeca depois do init (lacoAposInit);
//  4. idioma do portal (Poki: vazio, vale o navegador); progresso da nuvem do portal quando existe;
//  5. gameLoadingFinished no primeiro quadro; gameplayStart SO em jogadorAgiu() (gesto real);
//  6. commercialBreak SO em pausa natural (fim de uma partida da copa, troca de fase da aventura) e so
//     a partir da RODADA_PRIMEIRO_INTERVALO (partidas e fases contam juntas);
//  7. video premiado so por escolha, fora da tela de jogo ativa (chave, derrota, sem perolas), com opcao
//     gratis do mesmo tamanho ao lado;
//  8. ESC, espaco ou P pausam; aba oculta pausa; o mudo do portal nao desfaz o do jogador;
//  9. portal.intervaloSoNoClique (Y8): o intervalo so sai logo depois de um clique num botao (Jogar da chave,
//     Nova copa, Continuar da derrota, ou o "Continuar" entre fases) e a 180 s ou mais do anterior;
//     portal.pausaNoBlur (Y8): perder o foco abre a pausa.
import { portal, PLATAFORMA } from './core/plataforma.js';
import { criarArmazem } from './core/armazenamento.js';
import { criarAudio } from './core/audio.js';
import { criarHaptico } from './core/haptico.js';
import { criarLaco } from './core/laco.js';
import { criarEntrada } from './core/entrada.js';
import { lerDepuracao } from './core/depuracao.js';
import { criarTelemetria } from './core/telemetria.js';
import { escolherIdioma, definirIdioma, aplicarTextos, t, idioma, nomeRival, numero } from './i18n/textos.js';
import { criarMao, celebrar } from './ui/kit.js';
import * as telas from './ui/telas.js';
import { SONS } from './som/sons.js';
import { criarPartida, atirar, trocar, passo as passoPartida, darTiros, encerrarDerrota, tirosRestantes } from './jogo/partida.js';
import { passoIA, criarIA, decidir, opcoes } from './jogo/rival.js';
import { criarCopa, adversario, configPartida, registrar, colocacao, somarLiga, semanaIso, diaCorrido, RIVAIS, LIGAS, sementeRodada, habEfetiva } from './jogo/copa.js';
import { fase as faseAventura, FASES, RECIFES, FASES_SEM_DERROTA } from './jogo/aventura.js';
import { statsVazias, conquistados, skinsLiberadas, somarLado, novidades, TROFEUS, SKINS } from './jogo/colecao.js';
import { anguloPara, limitarAngulo } from './jogo/tiro.js';
import { X_CANHAO, Y_CANHAO, cada } from './jogo/grade.js';
import { carregarArte } from './render/arte.js';
import { layout, desenharPartida, desenharMenu, criarEfeitos, efeitoJogador, efeitoRival, passoEfeitos, naTela, noTabuleiro, lugarProxima } from './render/desenho.js';

/** Sem intervalo comercial antes desta rodada (regra do estudio: nada nas primeiras 5 a 7 fases). */
const RODADA_PRIMEIRO_INTERVALO = 6;
/** Ajuda automatica: s sem estourar nada, ou tiros seguidos sem acertar. */
const AJUDA_APOS = 9;
const AJUDA_ERROS = 4;
const LIGAS_ID = LIGAS.map((l) => l.id);

const dbg = lerDepuracao(['copa', 'tela', 'rodada', 'skin']);
const armazem = criarArmazem({ prefixo: 'bubblecup.' });
const audio = criarAudio();
const haptico = criarHaptico();
const tele = criarTelemetria(portal);

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
const tela = /** @type {HTMLCanvasElement} */ ($('tela'));
const g = /** @type {CanvasRenderingContext2D} */ (tela.getContext('2d'));
const camada = $('camada');
const ui = $('telaUi');
const caixaDica = $('dica');
const mao = criarMao(camada);

// ------------------------------------------------------------------ estado
function progressoNovo() {
  return {
    v: 1, liga: 0, ligaPts: 0, ensinoFeito: false, fase: 1, /** @type {Record<string, number>} */ estrelas: {}, skin: 'baiacu',
    stats: statsVazias(), ultimoDesafio: -1, /** @type {Record<string, string>} */ semanas: {}, rodadas: 0, /** @type {Record<string, boolean>} */ vistas: {},
  };
}

const E = {
  t: 0,
  pausado: false,
  pausaPortal: false,
  menu: false,
  jogou: false,
  /** @type {'jogo'|'hub'|'chave'|'resultado'|'colecao'|'semTiros'|'derrota'} */
  tela: 'hub',
  /** @type {import('./jogo/partida.js').Partida|null} */
  pt: null,
  /** @type {'copa'|'aventura'|'desafio'} */
  modo: 'copa',
  /** @type {import('./jogo/copa.js').Copa|null} */
  copa: null,
  faseAtual: 1,
  /** @type {{ id: string, nome: string }|null} */
  rival: null,
  fundo: 'estadio',
  /** @type {number|null} */
  mira: null,
  mirando: false,
  miraMouse: false,
  teclas: { esq: false, dir: false },
  ligarEm: 0,
  contagem: 0,
  bonusBomba: false,
  /** anuncios que de fato comecaram (onAdStart) */
  anuncios: 0,
  /** um intervalo foi exibido nesta pausa: nada de video premiado ate o jogador voltar a jogar (QA) */
  anuncioNaPausa: false,
  encerrando: false,
  tratandoSemTiros: false,
  semProgresso: 0,
  errosSeguidos: 0,
  ajudaMostrada: false,
  /** @type {{ tiros: number, ang: number }|null} */
  ajudaAlvo: null,
  maoEnsino: false,
  dicaAte: 0,
  rotuloFase: '',
  objetivo: '',
  autoEspera: 1,
  fx: criarEfeitos(),
  p: progressoNovo(),
  /** foto dos trofeus e skins para mostrar o que e novo */
  snap: { trofeus: /** @type {string[]} */ ([]), skins: /** @type {string[]} */ ([]) },
  /** @type {any} */
  L: null,
  dia: 0,
  semana: { ano: 0, semana: 0, semente: 0 },
};
const autoIA = criarIA(8, 7);

function carregarProgresso() {
  const p = dbg.novo ? null : armazem.ler('progresso', null);
  E.p = Object.assign(progressoNovo(), p || {});
  E.p.stats = Object.assign(statsVazias(), E.p.stats || {});
  E.p.stats.copas = Object.assign(statsVazias().copas, E.p.stats.copas || {});
  if (dbg.extras.skin) E.p.skin = dbg.extras.skin;
  const c = dbg.novo ? null : armazem.ler('copa', null);
  E.copa = c && typeof c === 'object' && Array.isArray(c.chave) ? c : null;
  E.snap = { trofeus: conquistados(E.p.stats), skins: skinsLiberadas(E.p.stats) };
}
function salvar() {
  armazem.gravar('progresso', E.p);
}
function salvarCopa() {
  armazem.gravar('copa', E.copa && E.copa.rodada < 3 ? E.copa : null);
}

// ------------------------------------------------------------------ portal: ganchos antes do init
const laco = criarLaco({ passo, desenhar });
portal.onAdStart = () => {
  E.anuncios++;
  audio.mudoParaAnuncio();
  laco.pausar(true);
};
portal.onAdEnd = () => {
  audio.voltarDoAnuncio();
  if (!congelado()) laco.pausar(false);
};
portal.onMudoPlataforma = (m) => audio.definirMudoPlataforma(m);
portal.onPausaPlataforma = (p) => {
  E.pausaPortal = p;
  if (p) portal.gameplayStop();
  laco.pausar(congelado() || portal.emAnuncio);
};
portal.onSemAnuncios = () => { if (E.tela === 'chave') abrirChave(); };

const congelado = () => E.pausado || E.pausaPortal || E.menu;
const temVideo = () => portal.temVideo && !dbg.semAnuncio;

/** Unico lugar com gameplayStart: gesto real do jogador, fora de pausa e de anuncio. */
function jogadorAgiu() {
  if (congelado() || portal.emAnuncio || E.tela !== 'jogo') return;
  E.jogou = true;
  portal.gameplayStart();
}

/** @param {keyof typeof SONS} nome @param {any} [p] @param {number} [atraso] */
function som(nome, p = {}, atraso = 0) {
  audio.tocarReceita(SONS[nome], p, { chave: nome, atraso });
}

// ------------------------------------------------------------------ laco
/** @param {number} dt */
function passo(dt) {
  if (congelado()) return;
  E.t += dt;
  if (portal.jogando) tele.jogando(dt);
  passoEfeitos(E.fx, dt, E.tela === 'jogo' ? E.pt : null, E.mirando || E.miraMouse || E.teclas.esq || E.teclas.dir);
  if (E.dicaAte && E.t > E.dicaAte) { E.dicaAte = 0; telas.dica(caixaDica, ''); }
  if (E.tela === 'chave' && E.contagem > 0) {
    E.contagem -= dt;
    telas.atualizarContagem(E.contagem);
    if (E.contagem <= 0) comecarRodadaCopa();
  }
  if (dbg.auto) passoAutoTelas(dt);
  if (E.tela !== 'jogo' || !E.pt) return;
  const pt = E.pt;
  if (!pt.relogio && E.ligarEm > 0) {
    E.ligarEm -= dt;
    if (E.ligarEm <= 0) pt.relogio = true;
  }
  if (E.teclas.esq || E.teclas.dir) {
    E.mira = limitarAngulo((E.mira ?? Math.PI / 2) + (E.teclas.esq ? 1 : -1) * 1.5 * dt);
  }
  const antes = pt.cfg.duracao ? Math.ceil(pt.cfg.duracao - pt.t) : 99;
  passoPartida(pt, dt, passoIA);
  const depois = pt.cfg.duracao ? Math.ceil(pt.cfg.duracao - pt.t) : 99;
  if (depois < antes && depois === 10) som('aviso');
  drenarEventos();
  if (!pt.jogador.voo && !pt.fim) E.semProgresso += dt;
  ajuda();
  if (dbg.auto) passoAuto(dt);
  if (pt.semTiros && !E.tratandoSemTiros && !pt.fim) tratarSemTiros();
  if (pt.fim && !E.encerrando) fimRodada();
}

function drenarEventos() {
  const pt = /** @type {import('./jogo/partida.js').Partida} */ (E.pt);
  const j = pt.jogador;
  for (const ev of j.eventos) {
    efeitoJogador(E.fx, ev, t, j.grade);
    if (ev.tipo === 'tiro') som(ev.cor === -3 ? 'arco' : 'tiro');
    else if (ev.tipo === 'troca') som('troca');
    else if (ev.tipo === 'pouso') {
      const r = ev.pecas;
      if (r.explodiu) som('bomba');
      if (r.estouradas.length) som('estouro', { combo: ev.combo, n: r.estouradas.length });
      if (r.caidas.length) som('queda', { n: r.caidas.length }, 0.12);
      if (r.peixes) som('peixe', {}, 0.12);
      if (!r.acertou) som('gruda');
      if (r.acertou) { E.semProgresso = 0; E.errosSeguidos = 0; } else E.errosSeguidos++;
      if (r.caidas.length >= 10) haptico.vibrar(35);
      else if (r.estouradas.length) haptico.vibrar(12);
      if (r.caidas.length >= 15) tele.evento('queda-grande', String(r.caidas.length >= 30 ? 30 : 15));
    } else if (ev.tipo === 'gelo') som('gelo');
    else if (ev.tipo === 'linha') { som('linha'); mostrarNovidade('linha', 'dicaLinha'); }
    else if (ev.tipo === 'transbordo') som('transbordo');
    else if (ev.tipo === 'limpo') som('festa');
  }
  j.eventos.length = 0;
  if (pt.rival) {
    for (const ev of pt.rival.eventos) efeitoRival(E.fx, ev);
    pt.rival.eventos.length = 0;
  }
  // novidades que aparecem na fila ou no tabuleiro
  for (const p of [j.atual, j.proxima]) {
    if (p.tipo === 'bomba') mostrarNovidade('bomba', 'dicaBomba');
    if (p.tipo === 'arco') mostrarNovidade('arco', 'dicaArco');
  }
}

/** Dica curta da primeira vez que algo aparece. @param {string} id @param {string} chave */
function mostrarNovidade(id, chave) {
  if (E.p.vistas[id]) return;
  E.p.vistas[id] = true;
  mostrarDica(t(chave), 3.8);
}
/** @param {string} texto @param {number} s */
function mostrarDica(texto, s) {
  telas.dica(caixaDica, texto);
  E.dicaAte = s > 0 ? E.t + s : 0;
}

// ------------------------------------------------------------------ ajuda (mao-guia)
function ajuda() {
  const pt = /** @type {import('./jogo/partida.js').Partida} */ (E.pt);
  const j = pt.jogador;
  const precisa = E.maoEnsino || E.semProgresso > AJUDA_APOS || E.errosSeguidos >= AJUDA_ERROS;
  if (!precisa || j.voo || pt.fim || E.mirando || dbg.auto) { if (!E.maoEnsino || E.mirando) mao.esconder(); return; }
  if (!E.ajudaAlvo || E.ajudaAlvo.tiros !== j.tiros) {
    const l = opcoes(j.grade, j.atual);
    E.ajudaAlvo = { tiros: j.tiros, ang: l.length ? l[0].ang : Math.PI / 2 };
  }
  if (!mao.visivel && !E.maoEnsino && !E.ajudaMostrada) {
    E.ajudaMostrada = true;
    tele.ajuda(E.p.rodadas);
  }
  const a = E.ajudaAlvo.ang;
  const L = E.L;
  if (!L) return;
  const de = naTela(L, X_CANHAO, Y_CANHAO - 2.5);
  const ate = naTela(L, X_CANHAO + Math.cos(a) * 9, Y_CANHAO - Math.sin(a) * 9);
  mao.mostrar(de.x, de.y, { ateX: ate.x, ateY: ate.y });
}

// ------------------------------------------------------------------ desenho
let W = 0;
let H = 0;
function medir() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  tela.width = Math.round(W * dpr);
  tela.height = Math.round(H * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  E.L = layout(W, H);
}

const btPausa = $('btPausa');
function desenhar() {
  const naPartida = E.tela === 'jogo';
  if (btPausa.hidden === naPartida) btPausa.hidden = !naPartida;
  const L = E.L || layout(W, H);
  E.L = L;
  if (E.pt && (E.tela === 'jogo' || E.tela === 'semTiros' || E.tela === 'derrota')) {
    const mostraMira = E.tela === 'jogo' && (E.mirando || E.miraMouse || E.teclas.esq || E.teclas.dir || dbg.auto);
    desenharPartida(g, E.pt, L, E.fx, {
      mira: mostraMira ? E.mira : null,
      skin: E.p.skin,
      rival: E.rival ? { id: E.rival.id, nome: nomeRival(E.rival) } : null,
      t: E.t,
      limpo: dbg.limpo && !dbg.filme,
      rotuloFase: E.rotuloFase,
      objetivo: E.objetivo,
      voce: t('voce'),
      relogioLigado: E.pt.relogio,
      segurando: E.pt.ia ? E.pt.ia.segurando : false,
      fundo: E.fundo,
    });
  } else desenharMenu(g, W, H, E.fundo, E.t);
  primeiroQuadro();
}

let carregouJa = false;
function primeiroQuadro() {
  if (carregouJa) return;
  carregouJa = true;
  portal.gameLoadingFinished();
  $('carregando').classList.add('saindo');
  setTimeout(() => $('carregando').remove(), 400);
}

// ------------------------------------------------------------------ tiro
/** @param {number} a */
function disparar(a) {
  const pt = E.pt;
  if (!pt || E.tela !== 'jogo' || congelado()) return;
  if (!atirar(pt, pt.jogador, a)) return;
  if (!pt.relogio && E.ligarEm <= 0) pt.relogio = true;
  if (E.maoEnsino) {
    E.maoEnsino = false;
    mao.esconder();
    telas.dica(caixaDica, '');
    E.dicaAte = 0;
  }
  E.ajudaMostrada = false;
  mao.esconder();
  // segunda dica do ensino: a troca
  if (E.copa && E.copa.ensino && E.copa.rodada === 0 && pt.jogador.tiros === 3) mostrarNovidade('troca', 'dicaTroca');
}

function trocarPerola() {
  const pt = E.pt;
  if (!pt || E.tela !== 'jogo' || congelado()) return;
  trocar(pt.jogador);
}

// ------------------------------------------------------------------ copa
function novaCopaLiga() {
  E.copa = criarCopa({ liga: E.p.liga, semente: (E.p.rodadas * 7919 + E.dia * 31 + E.p.liga) >>> 0 });
  salvarCopa();
  abrirChave();
}

function abrirChave() {
  const c = E.copa;
  if (!c) { abrirHub(); return; }
  E.tela = 'chave';
  E.pt = null;
  E.fundo = c.tipo === 'semana' ? 'jardim' : LIGAS[c.liga].fundo;
  mao.esconder();
  portal.gameplayStop();
  const r = adversario(c);
  telas.chave(ui, {
    titulo: c.tipo === 'semana' ? `${t('semana')} · ${t('semanaN', { n: E.semana.semana })}` : t('copaLiga', { liga: t(LIGAS_ID[c.liga]) }),
    rodada: c.rodada,
    chave: c.chave,
    vencedores: c.vencedores,
    placares: c.placares,
    rivais: RIVAIS,
    skin: E.p.skin,
    taca: c.tipo === 'semana' ? 'trofeu-taca-coral' : `trofeu-taca-${LIGAS_ID[c.liga]}`,
    proximo: RIVAIS[r],
    video: temVideo() && !c.ensino && !E.anuncioNaPausa,
    bonusBomba: E.bonusBomba,
    contagem: E.contagem,
  }, {
    jogar: async () => {
      som('clique');
      E.contagem = 0;
      if (portal.intervaloSoNoClique) await intervalo({ clique: true });
      comecarRodadaCopa();
    },
    bomba: () => pedirBomba(),
  });
  if (E.contagem <= 0) E.contagem = c.ensino ? 3.2 : 6;
  telas.atualizarContagem(E.contagem);
}

async function pedirBomba() {
  E.contagem = 0;
  telas.atualizarContagem(0);
  const ok = await portal.rewardedBreak('small');
  if (ok) {
    E.bonusBomba = true;
    E.anuncioNaPausa = true;
    tele.evento('premio', 'bomba');
  }
  if (E.tela === 'chave') { E.contagem = 0.001; abrirChave(); E.contagem = 0; telas.atualizarContagem(0); }
}

function comecarRodadaCopa() {
  E.contagem = 0;
  if (!E.copa || E.tela !== 'chave') return;
  ui.hidden = true;
  iniciarPartidaCopa();
}

function iniciarPartidaCopa() {
  const c = /** @type {import('./jogo/copa.js').Copa} */ (E.copa);
  const r = adversario(c);
  const cfg = configPartida(c);
  E.pt = criarPartida('copa', sementeRodada(c), cfg, criarIA(habEfetiva(c, r), sementeRodada(c)));
  if (E.bonusBomba) {
    E.pt.jogador.atual = { tipo: 'bomba', cor: -2 };
    E.bonusBomba = false;
  }
  E.rival = RIVAIS[r];
  E.modo = 'copa';
  E.fundo = c.tipo === 'semana' ? 'jardim' : LIGAS[c.liga].fundo;
  comecarRodada();
  const ensino = c.ensino && c.rodada === 0;
  E.pt.relogio = false;
  E.ligarEm = ensino ? 0 : 1.6;
  telas.versus(camada, { skin: E.p.skin, rival: E.rival, rodada: [t('quartas'), t('semi'), t('final')][c.rodada] });
  som('versus');
  if (ensino) {
    E.maoEnsino = true;
    mostrarDica(t(matchMedia('(pointer: fine)').matches ? 'dicaMouse' : 'dicaArraste'), 0);
  }
}

/** Comum a toda rodada (partida ou fase). */
function comecarRodada() {
  E.anuncioNaPausa = false;
  E.tela = 'jogo';
  ui.hidden = true;
  E.encerrando = false;
  E.tratandoSemTiros = false;
  E.semProgresso = 0;
  E.errosSeguidos = 0;
  E.ajudaMostrada = false;
  E.ajudaAlvo = null;
  E.mira = Math.PI / 2;
  E.mirando = false;
  E.fx = criarEfeitos();
  E.p.rodadas++;
  tele.fase(E.p.rodadas, 'start');
  salvar();
}

async function fimRodada() {
  E.encerrando = true;
  const pt = /** @type {import('./jogo/partida.js').Partida} */ (E.pt);
  const r = /** @type {NonNullable<typeof pt.resultado>} */ (pt.resultado);
  mao.esconder();
  E.maoEnsino = false;
  E.mirando = false;
  telas.dica(caixaDica, '');
  E.dicaAte = 0;
  somarLado(E.p.stats, pt.jogador);
  if (E.modo === 'copa') {
    const c = /** @type {import('./jogo/copa.js').Copa} */ (E.copa);
    tele.fase(E.p.rodadas, r.venceu ? 'complete' : 'fail');
    if (r.venceu) {
      if (r.pontosRival > 0 && r.pontos >= 2 * r.pontosRival) E.p.stats.dobro++;
      if (E.rival && E.rival.id === 'tuba') E.p.stats.vitoriasTuba++;
      salvar();
      som('vitoria');
      await celebrar(camada, t('venceu'), { sub: `${numero(r.pontos)} × ${numero(r.pontosRival)}`, ms: 2000 });
      registrar(c, true, r.pontos, r.pontosRival);
      salvarCopa();
      await intervalo({});
      if (c.rodada >= 3) fimCopa();
      else abrirChave();
    } else {
      salvar();
      som('derrota');
      portal.gameplayStop();
      // a revanche (video) vem antes; o intervalo so depois de aceitar (um anuncio por pausa)
      if (temVideo() && !c.ensino) abrirDerrota();
      else aceitarDerrota();
    }
    return;
  }
  // aventura e desafio
  const n = E.faseAtual;
  if (r.venceu) {
    tele.fase(E.p.rodadas, 'complete');
    tele.evento(E.modo === 'desafio' ? 'desafio' : `aventura-${n}`, 'complete');
    let sub = '★'.repeat(r.estrelas);
    if (E.modo === 'aventura') {
      const antes = E.p.estrelas[n] || 0;
      if (r.estrelas > antes) E.p.estrelas[n] = r.estrelas;
      E.p.fase = Math.max(E.p.fase, n + 1);
      E.p.stats.fases = Math.max(E.p.stats.fases, n);
      E.p.stats.estrelas3 = Object.values(E.p.estrelas).filter((x) => x >= 3).length;
    } else if (E.p.ultimoDesafio !== E.dia) {
      E.p.ultimoDesafio = E.dia;
      E.p.stats.carimbos++;
      sub = t('carimbos', { n: Math.min(7, E.p.stats.carimbos) });
    }
    salvar();
    som('festa');
    await celebrar(camada, E.modo === 'desafio' ? t('carimboDia') : t('faseFeita', { n }), { sub, ms: 1900 });
    avisarNovidades();
    await intervalo({ seguir: true });
    if (E.modo === 'aventura' && n < FASES) iniciarFase(n + 1);
    else abrirHub();
  } else {
    tele.fase(E.p.rodadas, 'fail');
    tele.evento(E.modo === 'desafio' ? 'desafio' : `aventura-${n}`, 'fail');
    salvar();
    await intervalo({ seguir: true });
    if (E.modo === 'desafio') iniciarDesafio();
    else iniciarFase(n);
  }
}

function abrirDerrota() {
  const pt = /** @type {import('./jogo/partida.js').Partida} */ (E.pt);
  const r = /** @type {NonNullable<typeof pt.resultado>} */ (pt.resultado);
  E.tela = 'derrota';
  telas.derrota(ui, { pontos: r.pontos, pontosRival: r.pontosRival, rival: /** @type {any} */ (E.rival), video: temVideo() }, {
    revanche: async () => {
      const ok = await portal.rewardedBreak('medium');
      if (ok) {
        tele.evento('premio', 'revanche');
        iniciarPartidaCopa();
      } else if (!temVideo()) abrirDerrota();
    },
    aceitar: () => { som('clique'); aceitarDerrota(); },
  });
}

async function aceitarDerrota() {
  const c = /** @type {import('./jogo/copa.js').Copa} */ (E.copa);
  const r = /** @type {any} */ (E.pt && E.pt.resultado) || { pontos: 0, pontosRival: 0 };
  registrar(c, false, r.pontos, r.pontosRival);
  ui.hidden = true;
  await intervalo({ clique: true });
  fimCopa();
}

function fimCopa() {
  const c = /** @type {import('./jogo/copa.js').Copa} */ (E.copa);
  const col = colocacao(c);
  const s = E.p.stats;
  let subiu = false;
  let pontosLiga = 0;
  const ligaAntes = E.p.liga;
  if (c.tipo === 'liga') {
    if (col === 'campeao') s.copas[LIGAS_ID[c.liga]] = (s.copas[LIGAS_ID[c.liga]] || 0) + 1;
    const res = somarLiga({ liga: E.p.liga, pontos: E.p.ligaPts }, col);
    pontosLiga = { campeao: 3, vice: 2, semi: 1, quartas: 0 }[col] || 0;
    subiu = res.subiu;
    E.p.liga = res.liga;
    E.p.ligaPts = res.pontos;
    s.ligaMax = Math.max(s.ligaMax, E.p.liga);
  } else {
    if (col === 'campeao') s.semanas++;
    const ordem = ['quartas', 'semi', 'vice', 'campeao'];
    const ant = E.p.semanas[String(c.semente)];
    if (!ant || ordem.indexOf(col) > ordem.indexOf(ant)) E.p.semanas[String(c.semente)] = col;
  }
  if (c.ensino) E.p.ensinoFeito = true;
  tele.evento(c.tipo === 'semana' ? 'copa-semana' : `copa-${LIGAS_ID[c.liga]}`, col);
  if (col === 'campeao') { portal.festa(); som('vitoria'); }
  const nv = novidades(E.snap.trofeus, E.snap.skins, s);
  E.snap = { trofeus: conquistados(s), skins: skinsLiberadas(s) };
  for (const k of nv.skins) tele.evento('skin', k);
  for (const k of nv.trofeus) tele.evento('trofeu', k);
  const campeaoRival = c.eliminado && c.vencedores[2] && c.vencedores[2][0] >= 0 ? RIVAIS[c.vencedores[2][0]] : null;
  E.copa = null;
  salvarCopa();
  salvar();
  E.tela = 'resultado';
  E.pt = null;
  portal.gameplayStop();
  const ligaId = LIGAS_ID[c.tipo === 'semana' ? 0 : ligaAntes];
  telas.resultado(ui, {
    colocacao: col,
    liga: LIGAS_ID[E.p.liga],
    pontosLiga,
    ligaPts: E.p.ligaPts,
    subiu,
    ligaTopo: E.p.liga === LIGAS.length - 1,
    semana: c.tipo === 'semana',
    novos: nv,
    trofeuArte: c.tipo === 'semana' ? 'trofeu-taca-coral' : `trofeu-taca-${ligaId}`,
    campeaoRival,
  }, {
    novaCopa: async () => {
      som('clique');
      if (portal.intervaloSoNoClique) { E.anuncioNaPausa = false; await intervalo({ clique: true }); }
      novaCopaLiga();
    },
    recife: () => { som('clique'); abrirHub(); },
  });
}

/** Trofeus e skins novos fora da copa (aventura, desafio): uma dica curta. */
function avisarNovidades() {
  const nv = novidades(E.snap.trofeus, E.snap.skins, E.p.stats);
  E.snap = { trofeus: conquistados(E.p.stats), skins: skinsLiberadas(E.p.stats) };
  const partes = [...nv.skins.map((k) => t('novaSkin', { nome: t(`s_${k}`) })), ...nv.trofeus.map((id) => t('novoTrofeu', { nome: telas.nomeTrofeu(id) }))];
  for (const k of nv.skins) tele.evento('skin', k);
  for (const k of nv.trofeus) tele.evento('trofeu', k);
  if (partes.length) mostrarDica(partes[0], 3.5);
}

/** s de jogo no ultimo intervalo pedido (so para o portal que exige clique) */
let ultimoIntervalo = -Infinity;
/**
 * Intervalo comercial na pausa natural.
 * @param {{ clique?: boolean, seguir?: boolean }} o clique: chamado logo depois de um clique num botao;
 *   seguir: no portal que exige clique, pode mostrar o "Continuar" (#btSeguir) para pedir o intervalo
 */
async function intervalo(o) {
  if (dbg.semAnuncio || !portal.temAnuncios || E.p.rodadas < RODADA_PRIMEIRO_INTERVALO || E.anuncioNaPausa) return;
  if (portal.intervaloSoNoClique) {
    // Y8: nunca automatico; e o portal so exibe um a cada ~3 min, entao o pedido so sai quando pode sair de fato
    if (tele.segundos - ultimoIntervalo < 180) return;
    if (!o.clique) {
      if (!o.seguir) return;
      await esperarClique(/** @type {HTMLButtonElement} */ ($('btSeguir')));
    }
  }
  ultimoIntervalo = tele.segundos;
  const antes = E.anuncios;
  await portal.commercialBreak();
  if (E.anuncios > antes) E.anuncioNaPausa = true;
}
/** @param {HTMLButtonElement} bt */
function esperarClique(bt) {
  return new Promise((ok) => {
    bt.hidden = false;
    bt.addEventListener('click', () => { bt.hidden = true; som('clique'); ok(undefined); }, { once: true });
  });
}

// ------------------------------------------------------------------ aventura e desafio
/** @param {number} n */
function iniciarFase(n) {
  const f = faseAventura(Math.max(1, Math.min(FASES, n)));
  E.faseAtual = f.n;
  E.modo = 'aventura';
  E.copa = E.copa && E.copa.rodada < 3 ? E.copa : null;
  E.pt = criarPartida('aventura', 1000 + f.n, f.cfg);
  E.rival = null;
  E.fundo = RECIFES[f.recife];
  E.rotuloFase = t('faseN', { n: f.n });
  E.objetivo = objetivoTexto(f.cfg.objetivo);
  comecarRodada();
  tele.evento(`aventura-${f.n}`, 'start');
  const chaves = { peixe: 'dicaPeixe', bomba: 'dicaBomba', pedra: 'dicaPedra', arco: 'dicaArco', gelo: 'dicaGelo' };
  for (const nv of f.novidades) mostrarNovidade(nv, /** @type {Record<string, string>} */ (chaves)[nv]);
  if (!f.novidades.length) {
    let temPedra = false;
    let temGelo = false;
    cada(E.pt.jogador.grade, (p) => { if (p.tipo === 'pedra') temPedra = true; if (p.gelo) temGelo = true; });
    if (temPedra) mostrarNovidade('pedra', 'dicaPedra');
    if (temGelo) mostrarNovidade('gelo', 'dicaGelo');
  }
}

function iniciarDesafio() {
  const f = faseAventura(0, { dia: E.dia });
  E.faseAtual = 0;
  E.modo = 'desafio';
  E.pt = criarPartida('desafio', 5000 + E.dia, f.cfg);
  E.rival = null;
  E.fundo = RECIFES[f.recife];
  E.rotuloFase = t('desafio');
  E.objetivo = objetivoTexto(f.cfg.objetivo);
  comecarRodada();
  tele.evento('desafio', 'start');
}

/** @param {any} o */
function objetivoTexto(o) {
  if (!o) return '';
  return o.tipo === 'peixes' ? t('objPeixes') : o.tipo === 'limpar' ? t('objLimpar') : t('objPontos');
}

function tratarSemTiros() {
  const pt = /** @type {import('./jogo/partida.js').Partida} */ (E.pt);
  E.tratandoSemTiros = true;
  if (E.modo === 'aventura' && E.faseAtual <= FASES_SEM_DERROTA) {
    darTiros(pt, 5);
    mostrarDica(t('mais5gratis'), 2.5);
    E.tratandoSemTiros = false;
    return;
  }
  if (dbg.auto || !temVideo()) {
    encerrarDerrota(pt);
    E.tratandoSemTiros = false;
    return;
  }
  E.tela = 'semTiros';
  portal.gameplayStop();
  telas.semTiros(ui, { video: true }, {
    mais: async () => {
      const ok = await portal.rewardedBreak('small');
      if (ok) {
        tele.evento('premio', 'mais5');
        darTiros(pt, 5);
        ui.hidden = true;
        E.tela = 'jogo';
        E.tratandoSemTiros = false;
      }
    },
    tentar: () => {
      som('clique');
      ui.hidden = true;
      E.tela = 'jogo';
      encerrarDerrota(pt);
      E.tratandoSemTiros = false;
    },
  });
}

// ------------------------------------------------------------------ hub e colecao
function abrirHub() {
  E.tela = 'hub';
  E.pt = null;
  E.rival = null;
  E.fundo = LIGAS[E.p.liga].fundo;
  mao.esconder();
  telas.dica(caixaDica, '');
  portal.gameplayStop();
  const s = E.p.stats;
  const proxSkin = SKINS.find((k) => !k.libera(s));
  const ligaTopo = E.p.liga === LIGAS.length - 1;
  const melhor = E.p.semanas[String(E.semana.semente)];
  telas.hub(ui, {
    liga: LIGAS_ID[E.p.liga],
    ligaPts: E.p.ligaPts,
    ligaTopo,
    copaEmCurso: E.copa && E.copa.rodada < 3 && E.copa.tipo === 'liga' ? [t('quartas'), t('semi'), t('final')][E.copa.rodada] : null,
    semana: E.semana.semana,
    melhorSemana: melhor ? ({ campeao: t('campeao'), vice: t('vice'), semi: t('semi'), quartas: t('quartas') }[melhor] || null) : null,
    fase: E.p.fase,
    recife: RECIFES[Math.floor((Math.min(FASES, E.p.fase) - 1) / 8)],
    desafioFeito: E.p.ultimoDesafio === E.dia,
    carimbos: s.carimbos,
    trofeus: conquistados(s).length,
    skins: skinsLiberadas(s).length,
    skin: E.p.skin,
    novidadeAventura: E.p.fase === 1,
    proximaMeta: ligaTopo ? (proxSkin ? `${t(`s_${proxSkin.id}`)}: ${t(`k_${proxSkin.id}`)}` : t('topoLiga')) : t('faltamLiga', { n: E.p.ligaPts, liga: t(LIGAS_ID[E.p.liga + 1]) }),
  }, {
    copa: () => { som('clique'); if (E.copa && E.copa.tipo === 'liga') abrirChave(); else novaCopaLiga(); },
    semana: () => {
      som('clique');
      E.copa = criarCopa({ tipo: 'semana', liga: 0, semente: E.semana.semente });
      tele.evento('semana', 'joga');
      abrirChave();
    },
    aventura: () => { som('clique'); iniciarFase(E.p.fase > FASES ? 1 + (E.dia % FASES) : E.p.fase); },
    desafio: () => { som('clique'); iniciarDesafio(); },
    trofeus: () => { som('clique'); abrirTrofeus(); },
    skins: () => { som('clique'); abrirSkins(); },
  });
}

function abrirTrofeus() {
  E.tela = 'colecao';
  const s = E.p.stats;
  const desc = (/** @type {string} */ id) => {
    if (id.startsWith('copa-') && id !== 'copas-10') return t('d_copa', { liga: t(id.slice(5)) });
    if (id.startsWith('liga-')) return t('d_liga', { liga: t(id.slice(5)) });
    if (id.startsWith('recife-')) return t('d_recife', { n: Number(id.slice(7)) * 8 });
    if (id === 'semana') return t('d_semana');
    return t(`d_${id}`);
  };
  telas.trofeus(ui, TROFEUS.map((tr) => ({ id: tr.id, arte: tr.arte, valor: tr.valor(s), meta: tr.meta, desc: desc(tr.id) })), () => { som('clique'); abrirHub(); });
}

function abrirSkins() {
  E.tela = 'colecao';
  const livres = skinsLiberadas(E.p.stats);
  telas.skins(ui, SKINS.map((k) => ({ id: k.id, livre: livres.includes(k.id) })), E.p.skin, (id) => {
    som('troca');
    E.p.skin = id;
    tele.evento('skin-usa', id);
    salvar();
    abrirSkins();
  }, () => { som('clique'); abrirHub(); });
}

// ------------------------------------------------------------------ bot (?auto: prints, videos e provas)
/** @param {number} dt */
function passoAuto(dt) {
  const pt = /** @type {import('./jogo/partida.js').Partida} */ (E.pt);
  if (pt.jogador.voo || pt.fim) return;
  E.autoEspera -= dt;
  if (E.autoEspera > 0) return;
  const d = decidir(autoIA, pt.jogador);
  if (d.trocar) trocar(pt.jogador);
  E.mira = d.ang;
  disparar(d.ang);
  E.autoEspera = Math.max(0.55, dbg.ritmo * 2.5);
}
/** No ?auto as telas seguem sozinhas. @param {number} dt */
function passoAutoTelas(dt) {
  E.autoEspera -= dt;
  if (E.autoEspera > -1.6) return;
  E.autoEspera = 1;
  if (E.tela === 'resultado') novaCopaLiga();
  else if (E.tela === 'derrota') aceitarDerrota();
  else if (E.tela === 'semTiros') { ui.hidden = true; E.tela = 'jogo'; if (E.pt) encerrarDerrota(E.pt); E.tratandoSemTiros = false; }
}

// ------------------------------------------------------------------ menu de pausa
function abrirMenu() {
  if (E.menu) return;
  E.menu = true;
  portal.gameplayStop();
  laco.pausar(true);
  $('menu').hidden = false;
}
function fecharMenu() {
  if (!E.menu) return;
  E.menu = false;
  $('menu').hidden = true;
  laco.pausar(congelado() || portal.emAnuncio);
}

// ------------------------------------------------------------------ entrada
criarEntrada(window, {
  primeiroGesto: () => audio.iniciar(),
  ponteiro: (fase, x, y, e) => {
    if (E.tela !== 'jogo' || !E.pt || congelado() || !E.L) return;
    const L = E.L;
    const b = noTabuleiro(L, x, y);
    const mouse = e.pointerType === 'mouse';
    if (fase === 'baixo') {
      tele.gesto(mouse ? 'mouse' : 'toque');
      jogadorAgiu();
      const pp = lugarProxima(L);
      if (Math.hypot(x - pp.x, y - pp.y) < L.k * 2.2) {
        trocarPerola();
        E.mirando = false;
        return;
      }
      const a = anguloPara(b.x, b.y);
      if (a === null) return;
      E.mirando = true;
      E.miraMouse = mouse;
      E.mira = a;
      if (E.maoEnsino) mao.esconder();
    } else if (fase === 'mover') {
      const a = anguloPara(b.x, b.y);
      if (mouse) E.miraMouse = true;
      if ((E.mirando || mouse) && a !== null) E.mira = a;
    } else if (fase === 'cima') {
      if (!E.mirando) return;
      E.mirando = false;
      const a = anguloPara(b.x, b.y);
      if (a === null) return;
      E.mira = a;
      disparar(a);
    }
  },
  tecla: (codigo, baixo) => {
    if (codigo === 'ArrowLeft' || codigo === 'KeyA') { E.teclas.esq = baixo; if (baixo) jogadorAgiu(); return; }
    if (codigo === 'ArrowRight' || codigo === 'KeyD') { E.teclas.dir = baixo; if (baixo) jogadorAgiu(); return; }
    if (!baixo) return;
    if (codigo === 'Escape' || codigo === 'Space' || codigo === 'KeyP') {
      if (E.menu) fecharMenu();
      else if (E.tela === 'jogo') abrirMenu();
      return;
    }
    if (E.tela !== 'jogo') return;
    jogadorAgiu();
    if (codigo === 'ArrowUp' || codigo === 'Enter' || codigo === 'KeyW') disparar(E.mira ?? Math.PI / 2);
    else if (codigo === 'KeyX' || codigo === 'ShiftLeft' || codigo === 'ShiftRight' || codigo === 'ArrowDown' || codigo === 'KeyS') trocarPerola();
  },
});
$('btPausa').addEventListener('click', () => { if (E.tela === 'jogo') abrirMenu(); });
$('btContinuar').addEventListener('click', () => { fecharMenu(); jogadorAgiu(); });
$('btRecifeMenu').addEventListener('click', () => { fecharMenu(); abrirHub(); });
$('btSom').addEventListener('click', () => {
  audio.definirMudo(!audio.mudo);
  $('btSom').setAttribute('aria-pressed', String(!audio.mudo));
  armazem.gravar('mudo', audio.mudo);
});
document.addEventListener('visibilitychange', () => {
  audio.pausarAba(document.hidden);
  if (document.hidden) {
    portal.gameplayStop();
    laco.pausar(true);
  } else laco.pausar(congelado() || portal.emAnuncio);
});
// o iframe do portal precisa de foco para o teclado (espaco nao rola a pagina do portal)
window.addEventListener('pointerdown', () => { try { window.focus(); } catch { /* ignora */ } });
window.addEventListener('resize', medir);
// Y8: perder o foco pausa (na partida abre o menu; na chave para a contagem que comecaria sozinha)
window.addEventListener('blur', () => {
  if (!portal.pausaNoBlur || !carregouJa) return;
  if (E.tela === 'jogo') abrirMenu();
  else if (E.tela === 'chave') { E.contagem = 0; telas.atualizarContagem(0); }
});

// ------------------------------------------------------------------ partida
function hoje() {
  const d = new Date();
  const a = d.getFullYear();
  const m = d.getMonth() + 1;
  const dia = d.getDate();
  E.dia = diaCorrido(a, m, dia);
  E.semana = semanaIso(a, m, dia);
}

async function iniciar() {
  medir();
  const pedidoInit = portal.init();
  const barra = /** @type {HTMLElement|null} */ (document.querySelector('#carregando .barra i'));
  const arte = carregarArte((f) => {
    portal.gameLoadingProgress(f);
    if (barra) barra.style.width = `${Math.round(f * 100)}%`;
  }, W / H < 1.05);
  await pedidoInit;
  await arte;
  armazem.usarFonte(await portal.fonteDados(), ['progresso', 'copa', 'mudo']);
  definirIdioma(escolherIdioma(dbg.lang || portal.idioma || navigator.language));
  document.documentElement.lang = { pt: 'pt-BR', en: 'en', es: 'es' }[idioma()];
  aplicarTextos(document);
  audio.definirMudo(armazem.ler('mudo', false) === true);
  $('btSom').setAttribute('aria-pressed', String(!audio.mudo));
  telas.definirArtesTrofeu(Object.fromEntries(TROFEUS.map((tr) => [tr.id, tr.arte])));
  hoje();
  carregarProgresso();
  primeiraTela();
  if (dbg.filme) {
    desenhar();
    return;
  }
  laco.iniciar();
}

/** Primeira carga direto na partida contra o rival mais fraco; quem volta cai no recife (um toque). */
function primeiraTela() {
  const ex = dbg.extras;
  if (dbg.fase > 0) { iniciarFase(dbg.fase); return; }
  if (ex.tela === 'trofeus') { abrirTrofeus(); return; }
  if (ex.tela === 'skins') { abrirSkins(); return; }
  if (ex.tela === 'hub') { E.p.ensinoFeito = true; abrirHub(); return; }
  if (ex.copa !== undefined) {
    const liga = Math.max(0, Math.min(3, Number(ex.copa) || 0));
    E.p.ensinoFeito = true;
    E.p.liga = liga;
    E.copa = criarCopa({ liga, semente: dbg.semente || 1234 });
    const rod = Math.max(0, Math.min(2, Number(ex.rodada) || 0));
    for (let i = 0; i < rod; i++) registrar(E.copa, true, 5000, 3000);
    if (ex.tela === 'chave') { abrirChave(); return; }
    E.tela = 'chave';
    comecarRodadaCopa();
    return;
  }
  if (!E.p.ensinoFeito) {
    if (!E.copa || !E.copa.ensino) E.copa = criarCopa({ liga: 0, semente: dbg.semente || 2026, ensino: true });
    if (E.copa.rodada === 0) { E.tela = 'chave'; comecarRodadaCopa(); return; }
    abrirChave();
    return;
  }
  abrirHub();
}

// ------------------------------------------------------------------ ganchos de teste (so local)
if (dbg.ganchos) {
  /** @type {any} */ (window).__jogo = {
    E,
    portal,
    audio,
    plataforma: PLATAFORMA,
    get lang() { return idioma(); },
    get jogou() { return portal.jogando; },
    get emAnuncio() { return portal.emAnuncio; },
    get menuAberto() { return E.menu; },
    /** ponto (px CSS) para um toque real que atira (no tabuleiro, na direcao do melhor tiro) */
    alvo() {
      if (E.tela !== 'jogo' || !E.pt || !E.L) return null;
      const l = opcoes(E.pt.jogador.grade, E.pt.jogador.atual);
      const a = l.length ? l[0].ang : Math.PI / 2;
      return naTela(E.L, X_CANHAO + Math.cos(a) * 8, Y_CANHAO - Math.sin(a) * 8);
    },
    /** termina a rodada atual com vitoria (prints e provas) */
    completar() {
      const pt = E.pt;
      if (!pt) return;
      if (pt.rival) {
        pt.jogador.pontos = Math.max(pt.jogador.pontos, pt.rival.pontos + 500);
        pt.relogio = true;
        pt.t = pt.cfg.duracao || 120;
        pt.jogador.voo = null;
        pt.rival.voo = null;
      } else {
        pt.fim = true;
        pt.resultado = { venceu: true, pontos: pt.jogador.pontos, pontosRival: 0, estrelas: 3 };
      }
    },
    /** atira o melhor tiro da vez (prints: a queda grande do ensino) */
    atirarMelhor() {
      if (!E.pt) return false;
      const l = opcoes(E.pt.jogador.grade, E.pt.jogador.atual);
      if (!l.length) return false;
      E.mira = l[0].ang;
      disparar(l[0].ang);
      return true;
    },
    /** salta o contador de rodadas (provas do intervalo comercial) @param {number} n */
    rodadas(n) { E.p.rodadas = n; },
    tirosRestantes() { return E.pt ? tirosRestantes(E.pt) : 0; },
    /** um quadro de video sem relogio real (?filme): avanca 1/fps e devolve o JPEG */
    quadro(fps = 30) {
      passo(1 / fps);
      desenhar();
      return tela.toDataURL('image/jpeg', 0.9);
    },
  };
}

iniciar();

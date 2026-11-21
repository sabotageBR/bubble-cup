// Telas em DOM por cima do canvas: hub do recife, chave da copa, resultado, derrota (revanche), sala de
// trofeus, canhoes, sem perolas e o "versus" do comeco da partida. So montam HTML e chamam as acoes que o
// main passa: nao tocam portal, audio nem salvamento. Botao de video premiado sempre ao lado de uma opcao
// gratis do mesmo tamanho (classe .par), e so quando o main diz que ha video.
import { t, nomeRival, numero } from '../i18n/textos.js';
import { botaoPremiado } from './kit.js';

const arte = (n) => `src/arte/${n}.webp`;

/**
 * @param {string} tag @param {Record<string, any>} [at] @param {(Node|string)[]} [filhos]
 * @returns {HTMLElement}
 */
function el(tag, at = {}, filhos = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(at)) {
    if (k === 'class') e.className = v;
    else if (k === 'texto') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const f of filhos) e.append(f);
  return e;
}
const img = (nome, cls = '') => el('img', { src: arte(nome), alt: '', class: cls, draggable: 'false' });

/** @param {HTMLElement} raiz @param {HTMLElement} painel */
function montar(raiz, painel) {
  raiz.replaceChildren(painel);
  raiz.hidden = false;
}

/** Botao comum. @param {string} texto @param {() => void} acao @param {string} [cls] @param {string} [id] */
function botao(texto, acao, cls = '', id = undefined) {
  return el('button', { type: 'button', class: `botao ${cls}`, id, onclick: acao, texto });
}

/** Par de botoes: premiado (🎬) e gratis do mesmo tamanho. */
function par(gratis, premiado) {
  const p = el('div', { class: 'par' });
  if (premiado) p.append(premiado);
  p.append(gratis);
  return p;
}

/** @param {string} texto @param {() => void} acao @param {string} id */
function premiado(texto, acao, id) {
  const b = /** @type {HTMLButtonElement} */ (el('button', { type: 'button', class: 'botao', id, onclick: acao }));
  botaoPremiado(b, texto);
  return b;
}

// ------------------------------------------------------------------ hub
/**
 * @param {HTMLElement} raiz
 * @param {{ liga: string, ligaPts: number, ligaTopo: boolean, copaEmCurso: string|null, semana: number, melhorSemana: string|null,
 *   fase: number, recife: string, desafioFeito: boolean, carimbos: number, trofeus: number, skins: number, skin: string,
 *   novidadeAventura: boolean, proximaMeta: string }} d
 * @param {Record<string, () => void>} a
 */
export function hub(raiz, d, a) {
  const cartao = (id, icone, titulo, sub, acao, extra = '') => el('button', { type: 'button', class: `cartao ${extra}`, id, onclick: acao }, [
    img(icone, 'cartao-icone'),
    el('span', { class: 'cartao-txt' }, [el('b', { texto: titulo }), el('small', { texto: sub })]),
  ]);
  const painel = el('div', { class: 'painel hub', role: 'dialog', 'aria-modal': 'true' }, [
    el('div', { class: 'hub-topo' }, [img(`canhao-${d.skin}`, 'hub-mascote'), el('h1', { class: 'logo', texto: t('titulo') })]),
    cartao('btCopa', `emblema-${d.liga}`, d.copaEmCurso ? `${t('copaLiga', { liga: t(d.liga) })} · ${d.copaEmCurso}` : t('copaLiga', { liga: t(d.liga) }),
      d.ligaTopo ? t('topoLiga') : t('faltamLiga', { n: d.ligaPts, liga: t(proximaLiga(d.liga)) }), a.copa, 'forte'),
    cartao('btSemana', 'trofeu-taca-coral', t('semana'), d.melhorSemana ? `${t('semanaN', { n: d.semana })} · ${t('campeaoSemana', { r: d.melhorSemana })}` : t('semanaN', { n: d.semana }), a.semana),
    cartao('btAventura', 'mapa', t('aventura'), `${t('faseDe', { n: Math.min(32, d.fase) })} · ${t(d.recife)}`, a.aventura, d.novidadeAventura ? 'novo' : ''),
    cartao('btDesafio', 'concha', t('desafio'), d.desafioFeito ? t('feitoHoje') : t('carimbos', { n: Math.min(7, d.carimbos) }), a.desafio),
    el('div', { class: 'hub-linha' }, [
      cartao('btTrofeus', 'trofeu-taca-ouro', t('trofeus'), `${d.trofeus}/24`, a.trofeus, 'meio'),
      cartao('btSkins', `canhao-${d.skin}`, t('skins'), `${d.skins}/9`, a.skins, 'meio'),
    ]),
    el('p', { class: 'miudo meta', texto: `${t('proximaMeta')}: ${d.proximaMeta}` }),
  ]);
  montar(raiz, painel);
}

/** @param {string} liga */
function proximaLiga(liga) {
  return { bronze: 'prata', prata: 'ouro', ouro: 'diamante', diamante: 'diamante' }[liga] || 'prata';
}

// ------------------------------------------------------------------ chave da copa
/**
 * @param {HTMLElement} raiz
 * @param {{ titulo: string, rodada: number, chave: number[], vencedores: number[][], placares: number[][][],
 *   rivais: { id: string, nome: string }[], skin: string, taca: string, proximo: { id: string, nome: string }|null,
 *   video: boolean, bonusBomba: boolean, contagem: number }} d
 * @param {{ jogar: () => void, bomba: () => void }} a
 */
export function chave(raiz, d, a) {
  const rosto = (i) => (i === -1 ? img(`canhao-${d.skin}`, 'rosto voce') : img(`rival-${d.rivais[i].id}`, 'rosto'));
  const colunas = [d.chave, ...d.vencedores.filter(Boolean)];
  const grade = el('div', { class: 'chave-grade' });
  colunas.slice(0, 4).forEach((col, ci) => {
    const c = el('div', { class: `chave-col c${ci}` });
    col.forEach((p, i) => {
      const passou = colunas[ci + 1] ? colunas[ci + 1].includes(p) : false;
      const pl = d.placares[ci] ? d.placares[ci][Math.floor(i / 2)] : null;
      const pts = pl ? numero(pl[i % 2]) : '';
      c.append(el('div', { class: `chave-slot${p === -1 ? ' voce' : ''}${colunas[ci + 1] && !passou ? ' fora' : ''}` }, [rosto(p), el('small', { texto: pts })]));
    });
    grade.append(c);
  });
  if (colunas.length < 4) grade.append(el('div', { class: 'chave-col c3' }, [el('div', { class: 'chave-slot taca' }, [img(d.taca, 'taca')])]));
  const filhos = [el('h2', { texto: d.titulo }), grade];
  if (d.proximo) {
    filhos.push(el('div', { class: 'proximo' }, [
      img(`rival-${d.proximo.id}`, 'proximo-rosto'),
      el('span', {}, [el('small', { texto: `${t('proximoRival')} · ${[t('quartas'), t('semi'), t('final')][d.rodada] || ''}` }), el('b', { texto: nomeRival(d.proximo) }), el('small', { class: 'bio', texto: t(`r_${d.proximo.id}`) })]),
    ]));
    const jogar = botao(d.bonusBomba ? `${t('jogar')} 💣` : t('jogar'), a.jogar, 'forte', 'btJogar');
    filhos.push(par(jogar, d.video && !d.bonusBomba ? premiado(t('bonusBomba'), a.bomba, 'btBonusBomba') : null));
    filhos.push(el('p', { class: 'miudo', id: 'contagem', texto: d.contagem > 0 ? t('comecaEm', { n: Math.ceil(d.contagem) }) : '' }));
  }
  montar(raiz, el('div', { class: 'painel chave', role: 'dialog', 'aria-modal': 'true' }, filhos));
}

/** @param {number} s */
export function atualizarContagem(s) {
  const c = document.getElementById('contagem');
  if (c) c.textContent = s > 0 ? t('comecaEm', { n: Math.ceil(s) }) : '';
}

// ------------------------------------------------------------------ derrota numa partida (revanche)
/**
 * @param {HTMLElement} raiz
 * @param {{ pontos: number, pontosRival: number, rival: { id: string, nome: string }, video: boolean }} d
 * @param {{ revanche: () => void, aceitar: () => void }} a
 */
export function derrota(raiz, d, a) {
  montar(raiz, el('div', { class: 'painel', role: 'dialog', 'aria-modal': 'true' }, [
    img(`rival-${d.rival.id}`, 'grande'),
    el('h2', { texto: t('perdeu') }),
    el('p', { class: 'placar', texto: `${numero(d.pontos)} × ${numero(d.pontosRival)}` }),
    par(botao(t('aceitar'), a.aceitar, 'forte', 'btAceitar'), d.video ? premiado(t('revanche'), a.revanche, 'btRevanche') : null),
  ]));
}

// ------------------------------------------------------------------ fim da copa
/**
 * @param {HTMLElement} raiz
 * @param {{ colocacao: string, liga: string, pontosLiga: number, ligaPts: number, subiu: boolean, ligaTopo: boolean, semana: boolean,
 *   novos: { trofeus: string[], skins: string[] }, trofeuArte: string, campeaoRival: { id: string, nome: string }|null }} d
 * @param {{ novaCopa: () => void, recife: () => void }} a
 */
export function resultado(raiz, d, a) {
  const titulo = { campeao: t('campeao'), vice: t('vice'), semi: t('semiRes'), quartas: t('quartasRes') }[d.colocacao] || '';
  const filhos = [
    el('div', { class: `trofeu-grande${d.colocacao === 'campeao' ? '' : ' cinza'}` }, [img(d.trofeuArte)]),
    el('h2', { texto: titulo }),
  ];
  if (d.campeaoRival) filhos.push(el('p', { class: 'miudo', texto: `${nomeRival(d.campeaoRival)} ${t('venceuRival')}` }));
  if (!d.semana) {
    filhos.push(el('p', { texto: d.subiu ? t('subiu', { liga: t(d.liga) }) : t('pontosLiga', { n: d.pontosLiga }) }));
    if (!d.subiu) filhos.push(el('p', { class: 'miudo', texto: d.ligaTopo ? t('topoLiga') : t('faltamLiga', { n: d.ligaPts, liga: t(proximaLiga(d.liga)) }) }));
  }
  const novos = el('div', { class: 'novos' });
  for (const k of d.novos.skins) novos.append(el('div', { class: 'novo-item' }, [img(`canhao-${k}`), el('small', { texto: t('novaSkin', { nome: t(`s_${k}`) }) })]));
  for (const id of d.novos.trofeus) novos.append(el('div', { class: 'novo-item' }, [img(arteTrofeu(id)), el('small', { texto: t('novoTrofeu', { nome: nomeTrofeu(id) }) })]));
  if (novos.childElementCount) filhos.push(novos);
  filhos.push(el('div', { class: 'par' }, [botao(t('recife'), a.recife, '', 'btRecife'), botao(t('novaCopa'), a.novaCopa, 'forte', 'btNovaCopa')]));
  montar(raiz, el('div', { class: 'painel', role: 'dialog', 'aria-modal': 'true' }, filhos));
}

/** @type {Record<string, string>} */
let ARTES_TROFEU = {};
/** @param {Record<string, string>} m */
export function definirArtesTrofeu(m) { ARTES_TROFEU = m; }
/** @param {string} id */
const arteTrofeu = (id) => ARTES_TROFEU[id] || 'trofeu-taca-ouro';
/** @param {string} id */
export const nomeTrofeu = (id) => t(id === 'semana' ? 'semanaT' : id);

// ------------------------------------------------------------------ sala de trofeus e canhoes
/**
 * @param {HTMLElement} raiz
 * @param {{ id: string, arte: string, valor: number, meta: number, desc: string }[]} lista
 * @param {() => void} voltar
 */
export function trofeus(raiz, lista, voltar) {
  const grade = el('div', { class: 'grade-colecao rolavel' });
  for (const tr of lista) {
    const ok = tr.valor >= tr.meta;
    const barra = el('i', { class: 'barra' }, [el('b', { style: `width:${Math.min(100, (tr.valor / tr.meta) * 100)}%` })]);
    grade.append(el('div', { class: `item${ok ? '' : ' bloqueado'}`, title: tr.desc }, [img(tr.arte), el('b', { texto: nomeTrofeu(tr.id) }), el('small', { texto: ok ? '✓' : tr.desc }), ok ? '' : barra]));
  }
  montar(raiz, el('div', { class: 'painel colecao', role: 'dialog', 'aria-modal': 'true' }, [
    el('h2', { texto: `${t('trofeus')} ${lista.filter((x) => x.valor >= x.meta).length}/${lista.length}` }), grade, botao(t('voltar'), voltar, 'forte', 'btVoltar'),
  ]));
}

/**
 * @param {HTMLElement} raiz
 * @param {{ id: string, livre: boolean }[]} lista @param {string} atual
 * @param {(id: string) => void} usar @param {() => void} voltar
 */
export function skins(raiz, lista, atual, usar, voltar) {
  const grade = el('div', { class: 'grade-colecao rolavel' });
  for (const s of lista) {
    const emUso = s.id === atual;
    grade.append(el('button', { type: 'button', class: `item${s.livre ? '' : ' bloqueado'}${emUso ? ' em-uso' : ''}`, disabled: !s.livre, onclick: () => usar(s.id) }, [
      img(`canhao-${s.id}`), el('b', { texto: t(`s_${s.id}`) }), el('small', { texto: emUso ? t('emUso') : s.livre ? t('usar') : t(`k_${s.id}`) }),
    ]));
  }
  montar(raiz, el('div', { class: 'painel colecao', role: 'dialog', 'aria-modal': 'true' }, [
    el('h2', { texto: t('skins') }), grade, botao(t('voltar'), voltar, 'forte', 'btVoltar'),
  ]));
}

// ------------------------------------------------------------------ sem perolas (aventura)
/**
 * @param {HTMLElement} raiz @param {{ video: boolean }} d
 * @param {{ mais: () => void, tentar: () => void }} a
 */
export function semTiros(raiz, d, a) {
  montar(raiz, el('div', { class: 'painel', role: 'dialog', 'aria-modal': 'true' }, [
    img('concha', 'grande'),
    el('h2', { texto: t('semTiros') }),
    par(botao(t('tentar'), a.tentar, 'forte', 'btTentar'), d.video ? premiado(t('mais5'), a.mais, 'btMais5') : null),
  ]));
}

// ------------------------------------------------------------------ versus (sem bloquear o toque)
/**
 * @param {HTMLElement} camada
 * @param {{ skin: string, rival: { id: string, nome: string }, rodada: string }} d
 */
export function versus(camada, d) {
  const v = el('div', { class: 'versus', 'aria-hidden': 'true' }, [
    el('div', { class: 'vs-lado esq' }, [img(`canhao-${d.skin}`)]),
    el('div', { class: 'vs-meio' }, [el('small', { texto: d.rodada }), el('b', { texto: 'VS' }), el('span', { texto: nomeRival(d.rival) })]),
    el('div', { class: 'vs-lado dir' }, [img(`rival-${d.rival.id}`)]),
  ]);
  camada.append(v);
  setTimeout(() => v.remove(), 1700);
}

/** Dica curta (pilula) sobre o canhao. @param {HTMLElement} alvo @param {string} texto */
export function dica(alvo, texto) {
  alvo.textContent = texto;
  alvo.hidden = !texto;
}

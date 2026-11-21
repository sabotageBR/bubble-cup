// Logica pura do Bubble Cup: grade hexagonal, trajetoria, estouro e queda, especiais, partida, IA do rival,
// copa, aventura e colecao.
import test from 'node:test';
import assert from 'node:assert/strict';
import { deTexto, vizinhos, posicao, criarGrade, inserirTopo, gravar, ler, contar, soltas, capacidade, LIMITE, COLS, chave } from '../src/jogo/grade.js';
import { simular, anguloPara, ANG_MIN, ANG_MAX } from '../src/jogo/tiro.js';
import { aplicarTiro, pontosTiro, multiplicador } from '../src/jogo/regras.js';
import { criarPartida, atirar, trocar, passo, tirosRestantes, darTiros } from '../src/jogo/partida.js';
import { opcoes, criarIA, passoIA, decidir, perfil } from '../src/jogo/rival.js';
import { criarCopa, adversario, configPartida, registrar, colocacao, somarLiga, semanaIso, diaCorrido, RIVAIS, LAYOUT_ENSINO, LIGAS, sementeRodada } from '../src/jogo/copa.js';
import { fase, FASES, peixesDaFase } from '../src/jogo/aventura.js';
import { statsVazias, conquistados, skinsLiberadas, TROFEUS, SKINS, somarLado, novidades } from '../src/jogo/colecao.js';
import { criarRng } from '../src/core/rng.js';

const N = (cor) => ({ tipo: 'n', cor });

test('grade: vizinhos sao simetricos e ficam a 2 raios de distancia', () => {
  const g = deTexto(['00000000000', '0000000000', '00000000000', '0000000000']);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < capacidade(g, r); c++) {
      for (const [a, b] of vizinhos(g, r, c)) {
        assert.ok(vizinhos(g, a, b).some(([x, y]) => x === r && y === c), `simetria ${r},${c} -> ${a},${b}`);
        const p = posicao(g, r, c);
        const q = posicao(g, a, b);
        assert.ok(Math.abs(Math.hypot(p.x - q.x, p.y - q.y) - 2) < 1e-9, 'distancia 2');
      }
    }
  }
});

test('grade: inserir no topo mantem a geometria das linhas que ja existiam', () => {
  const g = deTexto(['01230123012', '1230123012']);
  const antes = posicao(g, 1, 3);
  inserirTopo(g, () => N(5));
  const depois = posicao(g, 2, 3);
  assert.equal(depois.x, antes.x);
  assert.equal(capacidade(g, 0), COLS - 1);
  assert.equal(ler(g, 2, 3)?.cor, 0);
});

test('tiro: reto para cima numa grade vazia para no teto, no centro', () => {
  const g = criarGrade();
  const t = simular(g, Math.PI / 2);
  assert.equal(t.casa[0], 0);
  assert.equal(t.casa[1], 5);
  assert.equal(t.quiques, 0);
});

test('tiro: angulo raso ricocheteia na parede', () => {
  const g = criarGrade();
  const t = simular(g, 0.35);
  assert.ok(t.quiques >= 1);
  assert.equal(t.casa[0], 0);
});

test('tiro: nunca para em casa ocupada nem fica sem ligacao (sorteio de 400 tiros)', () => {
  const rng = criarRng(99);
  for (let k = 0; k < 400; k++) {
    const linhas = [];
    for (let r = 0; r < 6; r++) {
      const n = r % 2 ? 10 : 11;
      linhas.push(Array.from({ length: n }, () => (rng() < 0.8 ? String(Math.floor(rng() * 4)) : '.')).join(''));
    }
    const g = deTexto(linhas);
    for (const [r, c] of soltas(g)) gravar(g, r, c, null);
    const ang = ANG_MIN + rng() * (ANG_MAX - ANG_MIN);
    const t = simular(g, ang);
    assert.equal(ler(g, t.casa[0], t.casa[1]), null, 'casa vazia');
    const vizOcup = vizinhos(g, t.casa[0], t.casa[1]).some(([a, b]) => ler(g, a, b));
    assert.ok(t.casa[0] === 0 || vizOcup, `casa ${t.casa} solta no angulo ${ang}`);
  }
});

test('tiro: anguloPara recusa ponto abaixo do canhao e limita o angulo', () => {
  assert.equal(anguloPara(11, 40), null);
  const a = anguloPara(0, 20);
  assert.ok(a !== null && a >= ANG_MIN && a <= ANG_MAX);
});

test('regras: 3 iguais estouram e o que fica solto cai', () => {
  const g = deTexto(['11000000000', '.2........', '.3.........']);
  // (0,2..10) sao 0; tiro de cor 1 em (1,0) encosta em (0,0) e (0,1): grupo de 3
  const res = aplicarTiro(g, [1, 0], N(1));
  assert.equal(res.estouradas.length, 3);
  assert.equal(res.caidas.length, 0);
  // agora sem as duas 1: o 2 em (1,1) segue preso pelos 0 de cima
  assert.ok(ler(g, 1, 1));
});

test('regras: estourar a ponte derruba o cacho de baixo', () => {
  const g = deTexto(['.00........', '.1........', '.2.........', '.3........']);
  const res = aplicarTiro(g, [0, 0], N(0));
  assert.equal(res.estouradas.length, 3);
  assert.equal(res.caidas.length, 3);
  assert.equal(contar(g), 0);
  assert.ok(res.acertou);
});

test('regras: dois iguais so grudam (sem estouro, sem pontos)', () => {
  const g = deTexto(['0..........']);
  const res = aplicarTiro(g, [0, 1], N(0));
  assert.equal(res.estouradas.length, 0);
  assert.equal(res.acertou, false);
  assert.equal(contar(g), 2);
});

test('regras: bomba explode em volta (2 aneis), inclusive pedra; peixe conta', () => {
  const g = deTexto(['0123012301P', '1230F23012', '01230123012']);
  const res = aplicarTiro(g, [3, 5], { tipo: 'bomba', cor: -2 });
  assert.ok(res.explodiu);
  assert.ok(res.estouradas.length >= 6);
  assert.equal(ler(g, 3, 5), null);
  assert.ok(res.peixes >= 1);
});

test('regras: arco-iris vira a cor do maior grupo', () => {
  const g = deTexto(['00.11......']);
  const res = aplicarTiro(g, [0, 2], { tipo: 'arco', cor: -3 });
  assert.equal(res.estouradas.length, 3);
  assert.ok(res.cor === 0 || res.cor === 1);
});

test('regras: gelo nao combina e quebra com estouro vizinho; peixe solta com o grupo', () => {
  const g = deTexto(['00a........', '.F.........']);
  // a = cor 0 com gelo: o grupo e so (0,0),(0,1) + tiro
  const res = aplicarTiro(g, [1, 0], N(0));
  assert.equal(res.estouradas.length, 4, '3 cores + o peixe vizinho');
  assert.equal(res.peixes, 1);
  assert.equal(res.gelos.length, 1);
  assert.equal(ler(g, 0, 2)?.gelo, false);
});

test('regras: pontos crescem com a queda e o combo', () => {
  assert.equal(pontosTiro(3, 0, 1), 30);
  assert.equal(pontosTiro(0, 20, 1), 20 * 20 + 5 * 17 * 17);
  assert.equal(multiplicador(1), 1);
  assert.equal(multiplicador(9), 3);
  assert.ok(pontosTiro(3, 5, 4) > pontosTiro(3, 5, 1));
});

test('ensino: a primeira perola (vermelha) tem um tiro que derruba 20 ou mais', () => {
  const pt = criarPartida('copa', 1, configPartida(criarCopa({ liga: 0, semente: 1, ensino: true })));
  assert.equal(pt.jogador.atual.cor, 0);
  const l = opcoes(pt.jogador.grade, pt.jogador.atual);
  assert.ok(l[0].caidas >= 20, `queda ${l[0].caidas}`);
  assert.ok(atirar(pt, pt.jogador, l[0].ang));
  for (let i = 0; i < 120; i++) passo(pt, 1 / 60);
  assert.ok(pt.jogador.pontos >= 3000, `pontos ${pt.jogador.pontos}`);
  assert.ok(pt.jogador.quedaMax >= 20);
});

test('partida: mesma semente, mesmo tabuleiro dos dois lados; erros descem fileira', () => {
  const cfg = { cores: 4, linhas: 6, errosParaLinha: 2, duracao: 120, recarregar: true };
  const pt = criarPartida('copa', 77, cfg, criarIA(5, 77));
  assert.deepEqual(pt.jogador.grade, pt.rival?.grade);
  const linhas = pt.jogador.grade.linhas.length;
  // atira para os lados sem acertar ate descer uma fileira
  let desceu = false;
  for (let i = 0; i < 12 && !desceu; i++) {
    atirar(pt, pt.jogador, i % 2 ? 0.2 : Math.PI - 0.2);
    for (let k = 0; k < 90; k++) passo(pt, 1 / 60);
    desceu = pt.jogador.eventos.some((e) => e.tipo === 'linha');
  }
  assert.ok(desceu || pt.jogador.grade.linhas.length > linhas || pt.jogador.transbordos > 0);
});

test('partida: troca e relogio de 2 min encerram com resultado; o rival joga sozinho', () => {
  const cfg = { cores: 4, linhas: 7, errosParaLinha: 5, duracao: 120, recarregar: true, penalidade: 250 };
  const pt = criarPartida('copa', 5, cfg, criarIA(6, 5));
  const a = pt.jogador.atual;
  const b = pt.jogador.proxima;
  trocar(pt.jogador);
  assert.equal(pt.jogador.atual, b);
  assert.equal(pt.jogador.proxima, a);
  for (let i = 0; i < 60 * 125 && !pt.fim; i++) passo(pt, 1 / 60, passoIA);
  assert.ok(pt.fim);
  assert.ok(pt.resultado && pt.resultado.venceu === false, 'jogador parado perde');
  assert.ok((pt.rival?.tiros || 0) > 20, `rival atirou ${pt.rival?.tiros}`);
  assert.ok((pt.rival?.pontos || 0) > 0);
});

test('partida: deterministica (mesma semente e mesma IA, mesmo placar)', () => {
  const jogar = () => {
    const cfg = { cores: 5, linhas: 7, errosParaLinha: 5, duracao: 30, recarregar: true };
    const pt = criarPartida('copa', 31337, cfg, criarIA(8, 31337));
    for (let i = 0; i < 60 * 32 && !pt.fim; i++) passo(pt, 1 / 60, passoIA);
    return pt.rival?.pontos;
  };
  assert.equal(jogar(), jogar());
});

test('IA: habilidade alta faz mais pontos que a baixa (media de 6 partidas)', () => {
  const media = (hab) => {
    let s = 0;
    for (let k = 0; k < 6; k++) {
      const cfg = { cores: 4, linhas: 7, errosParaLinha: 5, duracao: 120, recarregar: true, penalidade: 250 };
      const pt = criarPartida('copa', 100 + k, cfg, criarIA(hab, 100 + k));
      for (let i = 0; i < 60 * 125 && !pt.fim; i++) passo(pt, 1 / 60, passoIA);
      s += pt.rival?.pontos || 0;
    }
    return s / 6;
  };
  const fraco = media(1);
  const forte = media(10);
  assert.ok(forte > fraco * 1.6, `forte ${forte} fraco ${fraco}`);
  assert.equal(perfil(1).troca, false);
  assert.ok(decidir(criarIA(10, 1), criarPartida('copa', 1, { cores: 4, linhas: 6 }).jogador).ang > 0);
});

test('IA: no ensino o rival segura abaixo do jogador', () => {
  const c = criarCopa({ liga: 0, semente: 3, ensino: true });
  const pt = criarPartida('copa', sementeRodada(c), { ...configPartida(c) }, criarIA(1, 3));
  let jogador = 0;
  for (let i = 0; i < 60 * 125 && !pt.fim; i++) {
    if (i % 90 === 0 && !pt.jogador.voo) {
      const o = opcoes(pt.jogador.grade, pt.jogador.atual)[0];
      if (o) atirar(pt, pt.jogador, o.ang);
      jogador++;
    }
    passo(pt, 1 / 60, passoIA);
  }
  assert.ok(pt.resultado?.venceu, `jogador ${pt.jogador.pontos} rival ${pt.rival?.pontos}`);
});

test('copa: ensino pega Pingo, depois Mel e Garra; colocacao e liga', () => {
  const c = criarCopa({ liga: 0, semente: 42, ensino: true });
  assert.equal(RIVAIS[adversario(c)].id, 'pingo');
  registrar(c, true, 3000, 1000);
  assert.equal(RIVAIS[adversario(c)].id, 'mel');
  registrar(c, true, 3000, 1000);
  assert.equal(RIVAIS[adversario(c)].id, 'garra');
  registrar(c, true, 3000, 1000);
  assert.equal(c.rodada, 3);
  assert.equal(colocacao(c), 'campeao');
  const e = somarLiga({ liga: 0, pontos: 4 }, 'campeao');
  assert.deepEqual(e, { liga: 1, pontos: 0, subiu: true });
  assert.equal(somarLiga({ liga: 3, pontos: 6 }, 'campeao').pontos, 6);
});

test('copa: derrota na semi termina a chave com um campeao rival', () => {
  const c = criarCopa({ liga: 2, semente: 9 });
  registrar(c, true, 5000, 4000);
  registrar(c, false, 3000, 4000);
  assert.ok(c.eliminado);
  assert.equal(colocacao(c), 'semi');
  assert.equal(c.vencedores[2].length, 1);
  assert.notEqual(c.vencedores[2][0], -1);
});

test('copa: a liga de cima tem mais cores e rivais mais fortes', () => {
  for (let i = 1; i < LIGAS.length; i++) {
    assert.ok(LIGAS[i].cores >= LIGAS[i - 1].cores);
    const m = (L) => L.rivais.reduce((a, r) => a + RIVAIS[r].hab, 0);
    assert.ok(m(LIGAS[i]) > m(LIGAS[i - 1]));
  }
});

test('copa da semana: semana ISO certa e a mesma chave para todos', () => {
  assert.deepEqual(semanaIso(2026, 11, 20), { ano: 2026, semana: 47, semente: 202647 });
  assert.equal(semanaIso(2027, 1, 1).semana, 53);
  assert.equal(semanaIso(2024, 12, 30).ano, 2025);
  assert.equal(diaCorrido(1970, 1, 2), 1);
  const a = criarCopa({ tipo: 'semana', liga: 0, semente: 202647 });
  const b = criarCopa({ tipo: 'semana', liga: 3, semente: 202647 });
  assert.deepEqual(a.chave, b.chave);
});

test('aventura: 32 fases validas, sem perola solta, objetivos possiveis', () => {
  for (let n = 1; n <= FASES; n++) {
    const f = fase(n);
    const g = /** @type {any} */ (f.cfg.grade);
    assert.equal(soltas(g).length, 0, `fase ${n} com perola solta`);
    assert.ok(contar(g) >= 10, `fase ${n} pequena`);
    assert.ok((f.cfg.tiros || 0) > 10);
    if (f.cfg.objetivo?.tipo === 'peixes') assert.ok(peixesDaFase(f) >= 3, `fase ${n} sem peixes`);
    assert.ok(g.linhas.length < LIMITE);
  }
  assert.deepEqual(fase(1).novidades, ['peixe']);
  assert.deepEqual(fase(2).novidades, ['bomba']);
  assert.equal(fase(5, { dia: 20000 }).cfg.tiros, fase(7, { dia: 20000 }).cfg.tiros, 'desafio do dia so depende do dia');
});

test('aventura: tiros acabam e +5 devolve o jogo', () => {
  const f = fase(1);
  const pt = criarPartida('aventura', 1, { ...f.cfg, tiros: 2 });
  atirar(pt, pt.jogador, 0.2);
  for (let i = 0; i < 90; i++) passo(pt, 1 / 60);
  atirar(pt, pt.jogador, 0.2);
  for (let i = 0; i < 90; i++) passo(pt, 1 / 60);
  assert.equal(tirosRestantes(pt), 0);
  assert.ok(pt.semTiros || pt.fim);
  assert.equal(atirar(pt, pt.jogador, 1), false);
  darTiros(pt, 5);
  assert.equal(tirosRestantes(pt), 5);
});

test('colecao: trofeus e skins pelos marcos', () => {
  const s = statsVazias();
  assert.deepEqual(conquistados(s), []);
  assert.deepEqual(skinsLiberadas(s), ['baiacu']);
  const tAntes = conquistados(s);
  const kAntes = skinsLiberadas(s);
  s.copas.bronze = 1;
  somarLado(s, { estouradas: 1200, quedaMax: 26, comboMax: 3 });
  const nv = novidades(tAntes, kAntes, s);
  assert.ok(nv.trofeus.includes('copa-bronze'));
  assert.ok(nv.trofeus.includes('queda-15'));
  assert.ok(nv.trofeus.includes('perolas-1000'));
  assert.deepEqual(nv.skins, ['polvo']);
  assert.equal(TROFEUS.length, 24);
  assert.equal(SKINS.length, 9);
  assert.equal(new Set(TROFEUS.map((t) => t.id)).size, 24);
  assert.ok(chave(1, 2) !== chave(2, 1));
});

test('todo modulo de src compila (o navegador carrega tudo como ES module)', async () => {
  const { execFileSync } = await import('node:child_process');
  const { readdirSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const raiz = new URL('../src', import.meta.url).pathname;
  const listar = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? listar(join(d, n)) : n.endsWith('.js') ? [join(d, n)] : []));
  for (const arq of listar(raiz)) execFileSync(process.execPath, ['--check', arq]);
});

test('tiro: colisao exata passa por uma fresta com folga e para no ponto do contato', () => {
  // duas perolas com uma casa vazia no meio (centros a 4 de distancia): reto para cima pelo meio passa
  const g = deTexto(['...........', '..........', '....0.0....']);
  const t = simular(g, Math.PI / 2);
  assert.equal(t.casa[0], 0, 'passou pela fresta ate o teto');
  // tocando uma perola: o contato fica a TOQUE do centro dela
  const g2 = deTexto(['.....0.....']);
  const t2 = simular(g2, Math.PI / 2);
  const c = posicao(g2, 0, 5);
  assert.ok(Math.abs(Math.hypot(t2.contato.x - c.x, t2.contato.y - c.y) - 1.8) < 1e-6);
  assert.notDeepEqual(t2.casa, [0, 5]);
});

// Textos do Bubble Cup em pt (pt-BR), en e es. O idioma vem do portal (portal.idioma: 'pt-BR' | 'en' |
// 'es'; vazio na Poki, e ai vale o do navegador). Ingles e obrigatorio na CrazyGames: na duvida, en.
// No HTML, data-t="chave" troca o textContent e data-t-aria="chave" o aria-label.

/** @typedef {'pt'|'en'|'es'} Idioma */

export const TEXTOS = {
  pt: {
    titulo: 'Bubble Cup', continuar: 'Continuar', seguir: 'Continuar ▶', pausa: 'Pausa', som: 'Som', recife: 'Recife', voltar: 'Voltar', voce: 'Você',
    dicaArraste: 'Arraste para mirar e solte!', dicaMouse: 'Mire com o mouse e clique!', dicaTroca: 'Toque na pérola de baixo para trocar',
    dicaBomba: 'Bomba! Explode tudo em volta', dicaArco: 'Arco-íris: vira a cor que você precisa', dicaPedra: 'Pedra não estoura: derrube!',
    dicaGelo: 'Gelo: estoure do lado para quebrar', dicaPeixe: 'Solte os peixinhos presos!', dicaLinha: '5 erros: desce uma fileira',
    quedaGrande: 'Que queda!', quedaEnorme: 'QUEDA GIGANTE!', combo: 'Combo ×{n}!', recifeLimpo: 'Recife limpo!', transbordou: 'Transbordou!',
    quartas: 'Quartas de final', semi: 'Semifinal', final: 'Final', copa: 'Copa', copaLiga: 'Copa {liga}', semana: 'Copa da semana', semanaN: 'Semana {n}',
    bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', diamante: 'Diamante',
    proximoRival: 'Próximo rival', jogar: 'Jogar', bonusBomba: 'Começar com bomba', comecaEm: 'Começa em {n}…',
    campeao: 'Campeão!', vice: 'Vice-campeão', semiRes: 'Parou na semifinal', quartasRes: 'Parou nas quartas',
    venceu: 'Você venceu!', perdeu: 'Não foi dessa vez', revanche: 'Revanche', aceitar: 'Continuar', novaCopa: 'Nova copa',
    pontosLiga: '+{n} pontos de liga', faltamLiga: '{n}/6 pontos para a {liga}', subiu: 'Subiu para a liga {liga}!', topoLiga: 'Liga Diamante: a mais alta!',
    aventura: 'Aventura', faseN: 'Fase {n}', faseDe: 'Fase {n}/32', desafio: 'Desafio do dia', carimbos: '{n}/7 carimbos', feitoHoje: 'Feito hoje! Volte amanhã',
    trofeus: 'Troféus', skins: 'Canhões', usar: 'Usar', emUso: 'Em uso', proximaMeta: 'Próxima meta', campeaoSemana: 'Melhor: {r}',
    objPeixes: 'Solte os peixinhos', objLimpar: 'Solte tudo do teto', objPontos: 'Faça os pontos',
    semTiros: 'Acabaram as pérolas!', mais5: '+5 pérolas', mais5gratis: '+5 pérolas de presente!', tentar: 'Tentar de novo',
    jardim: 'Jardim de Coral', algas: 'Floresta de Algas', navio: 'Navio Naufragado', fossa: 'Fossa Brilhante',
    faseFeita: 'Fase {n}!', novidade: 'Novidade!', novaSkin: 'Canhão novo: {nome}!', novoTrofeu: 'Troféu: {nome}!', carimboDia: 'Carimbo do dia!',
    rivalSegura: 'esperando…', venceuRival: 'venceu', chave: 'Chave',
    r_pingo: 'Tímido, comemora baixinho.', r_garra: 'Ranzinza, reclama de tudo.', r_mel: 'Sonhadora e distraída.', r_lulu: 'Vaidosa, só pensa na pérola dela.',
    r_rabisco: 'Brincalhão, faz careta.', r_tata: 'Calma: devagar e certeira.', r_faisca: 'Elétrica, atira sem parar.', r_estrela: 'Animada, torce até por você.',
    r_bigode: 'Se acha o rei do recife.', r_duda: 'Exibido, adora plateia.', r_sombra: 'Misteriosa, quase não fala.', r_tuba: 'O campeão. Bom de mira e bom perdedor.',
    n_tata: 'Dona Tatá', n_faisca: 'Faísca',
    s_baiacu: 'Baiacu', s_polvo: 'Polvo', s_tartaruga: 'Tartaruga', s_caranguejo: 'Caranguejo', s_lula: 'Lula', s_lanterna: 'Peixe-lanterna', s_narval: 'Narval', s_foca: 'Foca', s_axolote: 'Axolote',
    k_baiacu: 'O primeiro', k_polvo: 'Vença uma copa', k_tartaruga: 'Chegue à Prata', k_caranguejo: 'Vença 10 fases da aventura', k_lula: 'Chegue ao Ouro',
    k_lanterna: 'Vença uma copa da semana', k_narval: 'Chegue ao Diamante', k_foca: '12 troféus', k_axolote: '20 troféus',
    'copa-bronze': 'Taça Bronze', 'copa-prata': 'Taça Prata', 'copa-ouro': 'Taça Ouro', 'copa-diamante': 'Taça Diamante', semanaT: 'Copa da Semana',
    'liga-prata': 'Liga Prata', 'liga-ouro': 'Liga Ouro', 'liga-diamante': 'Liga Diamante',
    'recife-1': 'Jardim de Coral', 'recife-2': 'Floresta de Algas', 'recife-3': 'Navio Naufragado', 'recife-4': 'Fossa Brilhante',
    'queda-15': 'Queda de 15', 'queda-30': 'Queda de 30', limpo: 'Recife Limpo', 'combo-6': 'Combo ×6', dobro: 'Pelo Dobro', 'carimbos-7': '7 Carimbos',
    'perolas-1000': '1.000 Pérolas', 'perolas-5000': '5.000 Pérolas', 'peixes-50': '50 Peixinhos', 'estrelas-10': '10 Fases 3★', 'copas-10': '10 Copas', tuba: 'Venceu o Tuba',
    d_copa: 'Vença uma copa {liga}', d_semana: 'Vença uma copa da semana', d_liga: 'Chegue à liga {liga}', d_recife: 'Vença as fases até a {n}',
    'd_queda-15': 'Derrube 15 pérolas de uma vez', 'd_queda-30': 'Derrube 30 de uma vez', d_limpo: 'Limpe o recife numa partida da copa', 'd_combo-6': '6 acertos seguidos',
    d_dobro: 'Vença com o dobro dos pontos do rival', 'd_carimbos-7': 'Vença 7 desafios do dia', 'd_perolas-1000': 'Estoure 1.000 pérolas',
    'd_perolas-5000': 'Estoure 5.000 pérolas', 'd_peixes-50': 'Solte 50 peixinhos', 'd_estrelas-10': '3 estrelas em 10 fases', 'd_copas-10': 'Vença 10 copas', d_tuba: 'Vença o Tuba numa partida',
  },
  en: {
    titulo: 'Bubble Cup', continuar: 'Continue', seguir: 'Continue ▶', pausa: 'Paused', som: 'Sound', recife: 'Reef', voltar: 'Back', voce: 'You',
    dicaArraste: 'Drag to aim, release to shoot!', dicaMouse: 'Aim with the mouse and click!', dicaTroca: 'Tap the pearl below to swap',
    dicaBomba: 'Bomb! Blasts everything around', dicaArco: 'Rainbow: turns into the color you need', dicaPedra: 'Stones don\'t pop: drop them!',
    dicaGelo: 'Ice: pop next to it to break it', dicaPeixe: 'Free the trapped fish!', dicaLinha: '5 misses: a new row drops',
    quedaGrande: 'Big drop!', quedaEnorme: 'GIANT DROP!', combo: 'Combo ×{n}!', recifeLimpo: 'Reef cleared!', transbordou: 'Overflow!',
    quartas: 'Quarterfinal', semi: 'Semifinal', final: 'Final', copa: 'Cup', copaLiga: '{liga} Cup', semana: 'Weekly Cup', semanaN: 'Week {n}',
    bronze: 'Bronze', prata: 'Silver', ouro: 'Gold', diamante: 'Diamond',
    proximoRival: 'Next rival', jogar: 'Play', bonusBomba: 'Start with a bomb', comecaEm: 'Starts in {n}…',
    campeao: 'Champion!', vice: 'Runner-up', semiRes: 'Out in the semifinal', quartasRes: 'Out in the quarterfinal',
    venceu: 'You won!', perdeu: 'Not this time', revanche: 'Rematch', aceitar: 'Continue', novaCopa: 'New cup',
    pontosLiga: '+{n} league points', faltamLiga: '{n}/6 points to {liga}', subiu: 'Promoted to the {liga} league!', topoLiga: 'Diamond league: the very top!',
    aventura: 'Adventure', faseN: 'Level {n}', faseDe: 'Level {n}/32', desafio: 'Daily challenge', carimbos: '{n}/7 stamps', feitoHoje: 'Done today! Come back tomorrow',
    trofeus: 'Trophies', skins: 'Shooters', usar: 'Use', emUso: 'In use', proximaMeta: 'Next goal', campeaoSemana: 'Best: {r}',
    objPeixes: 'Free the fish', objLimpar: 'Drop everything', objPontos: 'Reach the score',
    semTiros: 'Out of pearls!', mais5: '+5 pearls', mais5gratis: '+5 pearls, on the house!', tentar: 'Try again',
    jardim: 'Coral Garden', algas: 'Kelp Forest', navio: 'Sunken Ship', fossa: 'Glowing Trench',
    faseFeita: 'Level {n}!', novidade: 'New!', novaSkin: 'New shooter: {nome}!', novoTrofeu: 'Trophy: {nome}!', carimboDia: 'Daily stamp!',
    rivalSegura: 'waiting…', venceuRival: 'won', chave: 'Bracket',
    r_pingo: 'Shy, cheers very quietly.', r_garra: 'Grumpy, complains about everything.', r_mel: 'Dreamy and distracted.', r_lulu: 'Vain, only cares about her pearl.',
    r_rabisco: 'A prankster who pulls faces.', r_tata: 'Calm: slow and precise.', r_faisca: 'Electric, never stops shooting.', r_estrela: 'Cheerful, even roots for you.',
    r_bigode: 'Thinks he rules the reef.', r_duda: 'A show-off who loves a crowd.', r_sombra: 'Mysterious, barely speaks.', r_tuba: 'The champion. Sharp aim, good loser.',
    n_tata: 'Granny Tata', n_faisca: 'Sparky',
    s_baiacu: 'Pufferfish', s_polvo: 'Octopus', s_tartaruga: 'Turtle', s_caranguejo: 'Crab', s_lula: 'Squid', s_lanterna: 'Anglerfish', s_narval: 'Narwhal', s_foca: 'Seal', s_axolote: 'Axolotl',
    k_baiacu: 'Your first', k_polvo: 'Win a cup', k_tartaruga: 'Reach Silver', k_caranguejo: 'Win 10 adventure levels', k_lula: 'Reach Gold',
    k_lanterna: 'Win a weekly cup', k_narval: 'Reach Diamond', k_foca: '12 trophies', k_axolote: '20 trophies',
    'copa-bronze': 'Bronze Cup', 'copa-prata': 'Silver Cup', 'copa-ouro': 'Gold Cup', 'copa-diamante': 'Diamond Cup', semanaT: 'Weekly Cup',
    'liga-prata': 'Silver League', 'liga-ouro': 'Gold League', 'liga-diamante': 'Diamond League',
    'recife-1': 'Coral Garden', 'recife-2': 'Kelp Forest', 'recife-3': 'Sunken Ship', 'recife-4': 'Glowing Trench',
    'queda-15': 'Drop of 15', 'queda-30': 'Drop of 30', limpo: 'Clean Reef', 'combo-6': 'Combo ×6', dobro: 'Double Up', 'carimbos-7': '7 Stamps',
    'perolas-1000': '1,000 Pearls', 'perolas-5000': '5,000 Pearls', 'peixes-50': '50 Fish', 'estrelas-10': '10 Levels 3★', 'copas-10': '10 Cups', tuba: 'Beat Tuba',
    d_copa: 'Win a {liga} cup', d_semana: 'Win a weekly cup', d_liga: 'Reach the {liga} league', d_recife: 'Win the levels up to {n}',
    'd_queda-15': 'Drop 15 pearls at once', 'd_queda-30': 'Drop 30 at once', d_limpo: 'Clear the reef in a cup match', 'd_combo-6': '6 hits in a row',
    d_dobro: 'Win with double the rival\'s score', 'd_carimbos-7': 'Win 7 daily challenges', 'd_perolas-1000': 'Pop 1,000 pearls',
    'd_perolas-5000': 'Pop 5,000 pearls', 'd_peixes-50': 'Free 50 fish', 'd_estrelas-10': '3 stars on 10 levels', 'd_copas-10': 'Win 10 cups', d_tuba: 'Beat Tuba in a match',
  },
  es: {
    titulo: 'Bubble Cup', continuar: 'Continuar', seguir: 'Continuar ▶', pausa: 'Pausa', som: 'Sonido', recife: 'Arrecife', voltar: 'Volver', voce: 'Tú',
    dicaArraste: '¡Arrastra para apuntar y suelta!', dicaMouse: '¡Apunta con el ratón y haz clic!', dicaTroca: 'Toca la perla de abajo para cambiar',
    dicaBomba: '¡Bomba! Explota todo alrededor', dicaArco: 'Arcoíris: se vuelve el color que necesitas', dicaPedra: 'La piedra no explota: ¡derríbala!',
    dicaGelo: 'Hielo: explota al lado para romperlo', dicaPeixe: '¡Libera los pececitos!', dicaLinha: '5 fallos: baja una fila',
    quedaGrande: '¡Qué caída!', quedaEnorme: '¡CAÍDA GIGANTE!', combo: '¡Combo ×{n}!', recifeLimpo: '¡Arrecife limpio!', transbordou: '¡Desborde!',
    quartas: 'Cuartos de final', semi: 'Semifinal', final: 'Final', copa: 'Copa', copaLiga: 'Copa {liga}', semana: 'Copa de la semana', semanaN: 'Semana {n}',
    bronze: 'Bronce', prata: 'Plata', ouro: 'Oro', diamante: 'Diamante',
    proximoRival: 'Próximo rival', jogar: 'Jugar', bonusBomba: 'Empezar con bomba', comecaEm: 'Empieza en {n}…',
    campeao: '¡Campeón!', vice: 'Subcampeón', semiRes: 'Fuera en semifinal', quartasRes: 'Fuera en cuartos',
    venceu: '¡Ganaste!', perdeu: 'Esta vez no', revanche: 'Revancha', aceitar: 'Continuar', novaCopa: 'Nueva copa',
    pontosLiga: '+{n} puntos de liga', faltamLiga: '{n}/6 puntos para {liga}', subiu: '¡Subiste a la liga {liga}!', topoLiga: 'Liga Diamante: ¡la más alta!',
    aventura: 'Aventura', faseN: 'Nivel {n}', faseDe: 'Nivel {n}/32', desafio: 'Desafío del día', carimbos: '{n}/7 sellos', feitoHoje: '¡Hecho hoy! Vuelve mañana',
    trofeus: 'Trofeos', skins: 'Cañones', usar: 'Usar', emUso: 'En uso', proximaMeta: 'Próxima meta', campeaoSemana: 'Mejor: {r}',
    objPeixes: 'Libera los pececitos', objLimpar: 'Suelta todo del techo', objPontos: 'Consigue los puntos',
    semTiros: '¡Se acabaron las perlas!', mais5: '+5 perlas', mais5gratis: '¡+5 perlas de regalo!', tentar: 'Intentar de nuevo',
    jardim: 'Jardín de Coral', algas: 'Bosque de Algas', navio: 'Barco Hundido', fossa: 'Fosa Brillante',
    faseFeita: '¡Nivel {n}!', novidade: '¡Novedad!', novaSkin: 'Cañón nuevo: {nome}!', novoTrofeu: 'Trofeo: {nome}!', carimboDia: '¡Sello del día!',
    rivalSegura: 'esperando…', venceuRival: 'ganó', chave: 'Cuadro',
    r_pingo: 'Tímido, celebra bajito.', r_garra: 'Gruñón, se queja de todo.', r_mel: 'Soñadora y distraída.', r_lulu: 'Presumida, solo piensa en su perla.',
    r_rabisco: 'Bromista, hace muecas.', r_tata: 'Tranquila: lenta y certera.', r_faisca: 'Eléctrica, dispara sin parar.', r_estrela: 'Alegre, hasta te anima a ti.',
    r_bigode: 'Se cree el rey del arrecife.', r_duda: 'Presumido, ama al público.', r_sombra: 'Misteriosa, casi no habla.', r_tuba: 'El campeón. Buena puntería y buen perdedor.',
    n_tata: 'Doña Tata', n_faisca: 'Chispa',
    s_baiacu: 'Pez globo', s_polvo: 'Pulpo', s_tartaruga: 'Tortuga', s_caranguejo: 'Cangrejo', s_lula: 'Calamar', s_lanterna: 'Pez linterna', s_narval: 'Narval', s_foca: 'Foca', s_axolote: 'Ajolote',
    k_baiacu: 'El primero', k_polvo: 'Gana una copa', k_tartaruga: 'Llega a Plata', k_caranguejo: 'Gana 10 niveles de aventura', k_lula: 'Llega a Oro',
    k_lanterna: 'Gana una copa de la semana', k_narval: 'Llega a Diamante', k_foca: '12 trofeos', k_axolote: '20 trofeos',
    'copa-bronze': 'Copa Bronce', 'copa-prata': 'Copa Plata', 'copa-ouro': 'Copa Oro', 'copa-diamante': 'Copa Diamante', semanaT: 'Copa de la Semana',
    'liga-prata': 'Liga Plata', 'liga-ouro': 'Liga Oro', 'liga-diamante': 'Liga Diamante',
    'recife-1': 'Jardín de Coral', 'recife-2': 'Bosque de Algas', 'recife-3': 'Barco Hundido', 'recife-4': 'Fosa Brillante',
    'queda-15': 'Caída de 15', 'queda-30': 'Caída de 30', limpo: 'Arrecife Limpio', 'combo-6': 'Combo ×6', dobro: 'Por el Doble', 'carimbos-7': '7 Sellos',
    'perolas-1000': '1.000 Perlas', 'perolas-5000': '5.000 Perlas', 'peixes-50': '50 Pececitos', 'estrelas-10': '10 Niveles 3★', 'copas-10': '10 Copas', tuba: 'Venciste a Tuba',
    d_copa: 'Gana una copa {liga}', d_semana: 'Gana una copa de la semana', d_liga: 'Llega a la liga {liga}', d_recife: 'Gana los niveles hasta el {n}',
    'd_queda-15': 'Derriba 15 perlas a la vez', 'd_queda-30': 'Derriba 30 a la vez', d_limpo: 'Limpia el arrecife en una partida de copa', 'd_combo-6': '6 aciertos seguidos',
    d_dobro: 'Gana con el doble de puntos del rival', 'd_carimbos-7': 'Gana 7 desafíos del día', 'd_perolas-1000': 'Explota 1.000 perlas',
    'd_perolas-5000': 'Explota 5.000 perlas', 'd_peixes-50': 'Libera 50 pececitos', 'd_estrelas-10': '3 estrellas en 10 niveles', 'd_copas-10': 'Gana 10 copas', d_tuba: 'Vence a Tuba en una partida',
  },
};

/**
 * 'pt-BR', 'pt', 'es-419', 'en-US'... -> pt | en | es (o resto vira en).
 * @param {string} codigo
 * @returns {Idioma}
 */
export function escolherIdioma(codigo) {
  const c = String(codigo || '').toLowerCase();
  if (c.startsWith('pt')) return 'pt';
  if (c.startsWith('es')) return 'es';
  return 'en';
}

/** @type {Idioma} */
let atual = 'en';

/** @param {Idioma} i */
export function definirIdioma(i) {
  atual = TEXTOS[i] ? i : 'en';
}

export const idioma = () => atual;

/**
 * @param {string} chave
 * @param {Record<string, string|number>} [vars]
 */
export function t(chave, vars) {
  const tabela = /** @type {Record<string, string>} */ (TEXTOS[atual]);
  let s = tabela[chave] ?? /** @type {Record<string, string>} */ (TEXTOS.en)[chave] ?? chave;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Nome de exibicao do rival (com acento ou traduzido quando ha). @param {{ id: string, nome: string }} r */
export function nomeRival(r) {
  const k = `n_${r.id}`;
  const tabela = /** @type {Record<string, string>} */ (TEXTOS[atual]);
  return tabela[k] || r.nome;
}

/** @param {number} n */
export function numero(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, atual === 'en' ? ',' : '.');
}

/** @param {ParentNode} raiz */
export function aplicarTextos(raiz) {
  for (const el of raiz.querySelectorAll('[data-t]')) el.textContent = t(/** @type {string} */ (el.getAttribute('data-t')));
  for (const el of raiz.querySelectorAll('[data-t-aria]')) el.setAttribute('aria-label', t(/** @type {string} */ (el.getAttribute('data-t-aria'))));
}

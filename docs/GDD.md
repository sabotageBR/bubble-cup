# Bubble Cup: GDD

Jogo original do estúdio (nome, tema, personagens, fases e arte próprios). Da referência de gênero
(bubble shooter de torneio) vem só a mecânica: mirar, atirar uma bolha, 3 ou mais iguais estouram e o que fica
solto cai. Porta local 5450, prefixo de armazenamento `bubblecup.`.

## Nome

"Bubble Cup" foi conferido em 2026-11-20: nenhum jogo com esse nome na Poki, na CrazyGames, na App Store nem no
Google Play (buscas na web por `"Bubble Cup" game`, `"Bubble Cup" app` e com os nomes dos portais). O mais perto é
"Bubble Shooter World Cup" (GamePix, bolhas com bandeiras de futebol), outro nome e outro tema. "Bubble Cup" também é
o nome de uma competição de programação da Microsoft Sérvia (não é jogo). Nome mantido.

## Gancho

Bubble shooter num **recife de coral**. O canhão é um baiacu (e outras criaturas, as skins); as bolhas são pérolas
coloridas. O diferencial é a **Copa**: partidas de 2 minutos contra rivais-bot com rosto, nome e personalidade,
jogando **o mesmo tabuleiro** ao mesmo tempo. O placar do rival corre num painel pequeno. Chave de 8: quartas,
semi e final.

## Laço

1. Mirar arrastando (mouse ou toque) a partir de qualquer ponto do tabuleiro: a linha de mira mostra o caminho com
   o ricochete na parede e a pérola-fantasma onde ela vai parar.
2. Soltar atira. Toque (ou clique) na pérola de baixo troca a da vez com a próxima.
3. 3 ou mais da mesma cor estouram; tudo que fica sem ligação com o teto cai e vale muito mais.
4. Cinco tiros seguidos sem estourar nada descem uma fileira nova do teto (os pontinhos ao lado do canhão contam).
5. Na Copa, ganha quem tiver mais pontos em 2 minutos. Limpar o recife inteiro vale +1000 e desce um recife novo.

Pontuação (pura, `src/jogo/regras.js`): estouro 10 por pérola × combo; queda `20·n + 5·max(0, n−3)²` × combo (uma
queda de 20 vale 1.845); combo = tiros seguidos que estouram (×1, ×1,25 ... até ×3). Transbordar (pérola abaixo da
linha) lava as 4 fileiras de baixo e tira 250 pontos (nunca na primeira copa).

### Física e recife vivo (1.1.0, pedido do usuário)

- **Tiro**: colisão exata (varredura contínua de círculo contra círculo, `src/jogo/tiro.js`) com distância de toque
  de 1,8 raio: a pérola passa por qualquer fresta com essa folga e para no ponto exato do contato. Ricochete exato
  na parede. A IA do rival, a ajuda e a linha de mira usam a mesma conta.
- **Voo**: a pérola voa esticada no sentido do movimento, com rastro, e achata contra a parede no ricochete; as
  pérolas que ela raspa abrem caminho (mola).
- **Encaixe**: sai do ponto do contato e assenta na casa com um quique (mola subamortecida); as vizinhas cedem para
  longe do baque e voltam oscilando (a bomba empurra mais).
- **Tabuleiro**: toda pérola boia de leve (fase própria); as de baixo tremem quando o recife está perto da linha.
- **Estouro em onda** a partir do ponto do tiro (incha, anel e gotas); o que fica solto treme, despenca com
  gravidade, esbarra uma na outra, quica no fundo, rola e espirra. A fileira nova desce com mola.
- **Canhão**: a criatura (9 skins, desenhadas sem pérola, boca em "O") segura a pérola da vez numa bolha de sabão
  que boia na frente da boca; incha ao mirar, sopra no disparo (encolhe, achata, solta bolhinhas) e a próxima
  pérola voa da concha até a boca (e as duas trocam em arco na troca).
- **Som**: cada acerto é UM som (o pop limpo do estouro; a queda é um mergulho com acorde). Nada de cliques rápidos
  em sequência ("catraca", tique-taque do relógio): o relógio só toca um sino aos 10 s.

### Controles

| Entrada | Ação |
|---|---|
| Arrastar e soltar (mouse ou toque) | mirar e atirar |
| Toque/clique na pérola de baixo, ou X/Shift | trocar a pérola |
| ← → (ou A D) | girar a mira; ↑ ou Enter atira |
| Esc, Espaço ou P | pausa |

## Modos

- **Copa** (liga): chave de 8 com o jogador e 7 rivais do nível da liga. Quartas, semi e final, cada uma com 2 min.
  As outras partidas da chave são simuladas pela habilidade. Pontos de liga: campeão 3, vice 2, semi 1. Com 6 pontos
  sobe: **Bronze → Prata → Ouro → Diamante**. Cada liga tem mais cores e rivais mais rápidos e certeiros.
- **Copa da semana**: chave fixa e tabuleiros da semente da semana (ano·100 + semana ISO). Todo mundo joga a mesma
  copa na semana. Troféu próprio por semana vencida.
- **Aventura**: 32 fases em 4 recifes (Jardim de Coral, Floresta de Algas, Navio Naufragado, Fossa Brilhante), com
  objetivos (limpar o topo, soltar os peixinhos presos em bolhas, fazer N pontos) e pérolas especiais introduzidas
  aos poucos: peixinhos (fase 1), bomba (2), pedra (4), arco-íris (6), gelo (9). Tiros contados, generosos: sem
  derrota nas 6 primeiras fases (acabou o tiro, ganha +5 grátis); depois, tentar de novo (grátis) ou 🎬 +5 tiros.
- **Desafio do dia**: uma fase com a semente do dia. Vencer carimba o dia numa faixa de 7 carimbos (sem sequência
  obrigatória, sem FOMO). 7 carimbos dão um troféu.
- **Sala de troféus**: a meta longa. 24 troféus (copas por liga, copa da semana, ligas, recifes da aventura e
  façanhas: queda de 15 e de 30, recife limpo, combo ×3, vencer pelo dobro, 7 carimbos, 10 copas...). Os que faltam
  aparecem em silhueta com a dica de como ganhar.
- **Skins de canhão**: baiacu (inicial), polvo, tartaruga, caranguejo, lula, peixe-lanterna, narval, foca e axolote,
  cada uma liberada por um marco (1ª copa, prata, 10 fases da aventura, ouro, copa da semana, diamante, 20 troféus...).

### Os rivais (12, criaturas do mar)

| # | Nome | Criatura | Personalidade | Habilidade |
|---|---|---|---|---|
| 1 | Pingo | filhote de cavalo-marinho | tímido, comemora baixinho | 1 |
| 2 | Garra | caranguejo-ermitão | ranzinza, reclama de tudo | 2 |
| 3 | Mel | água-viva azul | sonhadora, distraída | 2 |
| 4 | Lulu | ostra | vaidosa, só pensa na pérola dela | 3 |
| 5 | Rabisco | lula | brincalhão, faz careta | 4 |
| 6 | Dona Tatá | tartaruga velha | calma, joga devagar e certeiro | 4 |
| 7 | Faísca | enguia elétrica | elétrica, atira sem parar | 5 |
| 8 | Estrela | estrela-do-mar | animada, torce até pelo adversário | 6 |
| 9 | Bigode | lagosta | orgulhoso, se acha o rei do recife | 7 |
| 10 | Duda | golfinho | exibido, adora plateia | 8 |
| 11 | Sombra | raia-manta | misteriosa, quase não fala | 9 |
| 12 | Tuba | tubarãozinho | o campeão; competitivo e bom perdedor | 10 |

IA do rival (`src/jogo/rival.js`, pura): a cada tiro, prova ~48 ângulos com a pérola da vez e a próxima, simula o
caminho e o resultado, e escolhe a melhor com chance `0,35 + 0,065·hab` (senão uma das 5 melhores). O tiro real sai
com ruído de mira `0,09 − 0,008·hab` rad e um intervalo de `3,4 − 0,22·hab` s. Joga o mesmo tabuleiro com as mesmas
regras. A habilidade efetiva tem um ajuste por liga (Bronze −2,4, Prata −1,2, Ouro −0,3, Diamante +0,4). Na primeira
copa (ensino), o rival só escolhe tiros que o deixam abaixo de 85% dos pontos do jogador.

## Os 3 primeiros minutos (primeira carga)

| Tempo | O que acontece |
|---|---|
| 0 s | Sem menu: o tabuleiro das quartas já está na tela, contra **Pingo** (hab. 1). Painel do rival no canto. Mão-guia arrasta do canhão até o ponto certo. Frase curta: "Arraste para mirar e solte!" |
| ~5 s | 1º tiro (vermelho) acerta 2 vermelhas que seguram um cacho de ~20 pérolas: estouro + **queda grande** (o "uau"), "+1.8k", tela treme, peixinhos fogem |
| 10–60 s | Tiros livres. Sem progresso em 4 tiros (ou 6 s parado): a mão mostra o melhor tiro. Frase 2: "Toque na pérola de baixo para trocar" quando a troca ajudaria |
| ~60 s | Fileira nova desce (os 5 pontinhos ensinam sozinhos) |
| 2:00 | Fim: vitória garantida (rival segura). Festa curta 2 s sem véu, a chave aparece por 2,5 s com o caminho até a final e segue sozinha |
| 2:10 | **Novidade**: semifinal contra Mel; aparece a **pérola-bomba** na fila (dica curta) |
| 4:20 | Final contra Garra; aparece a **arco-íris**. Vitória → troféu Copa Bronze, canhão polvo, Aventura liberada |
| ~6:40 | Hub do recife: Copa (liga), Copa da semana, Aventura, Desafio do dia, Troféus, Skins. Recomenda a Aventura (novidade: peixinhos, pedra...) |

Sem derrota nos primeiros minutos: nas 3 partidas da primeira copa o rival só atira o que o mantém abaixo de 85% dos
pontos do jogador (`passoIA` com `cfg.segurar`), e transbordar não tira pontos. A primeira copa é sempre vencida.

## Novidade a cada ~2 min

Bomba (2:10) → arco-íris (4:20) → troféu + skin + Aventura (6:40) → peixinhos e pedra na aventura (8–10 min) → gelo
(~14 min) → Copa da semana e Prata (~15 min, rivais novos e 5ª cor) → cada liga troca o estádio de fundo e o elenco.

## Meta longa

Sala de troféus (24), skins (9), liga até Diamante, 32 fases da aventura com estrelas, carimbos do desafio do dia.
A próxima meta aparece no hub ("Faltam 2 pontos para a Prata", "Próxima skin: tartaruga").

## Calibragem (bot de testes, `npm run bot`)

Perfis do jogador-bot: novato (2,6 s entre tiros, ruído 0,03 rad, escolhe a melhor em 45%), médio (1,9 s, 0,015,
70%) e bom (1,3 s, 0,008, 90%). Medido em 2026-11-20, de novo na 1.1.0 com a colisão exata (10 a 14 copas por perfil e liga; 6 a 8 tentativas por fase):

| | Novato | Médio | Bom |
|---|---|---|---|
| Primeira copa (ensino) | campeão, ~6,4 min | campeão | campeão |
| Bronze: campeão / partidas ganhas | 57–70% / 73–88% | 90–100% / 97–100% | 100% |
| Prata | 10% / 63% | 60% / 86% | 100% |
| Ouro | 0% / 23% | 30% / 72% | 70% / 90% |
| Diamante | 0% / 9% | 0% / 52% | 40% / 76% |
| Aventura: fases com ≥ 82% de vitória | 31 de 32 (a 22 com 67–75%) | 32 de 32 | — |

Duração: uma copa completa ≈ 6,5 min (3 × 2 min + chave); uma fase da aventura leva 20–90 s (médio) ou 35–180 s
(novato); a aventura inteira ≈ 23 min para o médio e ≈ 53 min para o novato. Tabuleiro da copa com `grudar` 0,32 (cachos médios; 0,5 virava
paredes de uma cor só).

## Anúncios

- Nenhum intervalo antes da 6ª rodada (partidas e fases contam juntas, ~12 min de copa) e só em pausa natural: a
  tela da chave entre partidas da copa, e a volta ao hub depois de uma fase da aventura. Nunca em botão de navegação.
- Premiado só por escolha, fora do jogo ativo, com opção grátis do mesmo tamanho ao lado:
  - derrota na copa: **🎬 Revanche** (rejoga a mesma partida) | **Continuar** (aceita);
  - antes de uma partida da copa: **🎬 Começar com bomba** | **Jogar**;
  - aventura sem tiros (fase 7+): **🎬 +5 tiros** | **Tentar de novo**.
- Um anúncio por pausa (regra GAMEPLAY_RETOMADO_APOS_INTERVALO do QA do California): se um intervalo foi exibido no
  fim da partida, a chave não oferece o vídeo da bomba; na derrota, o intervalo só vem depois de "Continuar".
- Basic Launch da CrazyGames: nenhum botão de vídeo (`portal.temVideo` falso).
- **Y8** (`portal.intervaloSoNoClique`): o intersticial nunca é automático. Sai só logo depois de um clique em botão
  ("Jogar" na chave, "Nova copa", "Continuar" da derrota, ou o "Continuar ▶" que aparece entre fases da aventura) e
  com 180 s ou mais de jogo desde o anterior; no fim da partida não há pedido. `portal.pausaNoBlur`: perder o foco
  abre a pausa (na chave, para a contagem que começaria sozinha).

## Telemetria (kit)

`level/N/start|complete|fail` (N = rodada contada: partidas e fases), `game/toque|mouse`, `tempo/min-N`,
`ajuda/<rodada>`, e eventos próprios: `evento/copa-<liga>/campeao|vice|semi|quartas`, `evento/queda-grande/15`,
`evento/skin/<id>`, `evento/trofeu/<id>`, `evento/semana/joga`, `evento/aventura-<fase>/start|complete|fail`.

## Tela

Retrato primeiro: tabuleiro de 11 colunas ocupando a largura, canhão embaixo, painel do rival no topo. Em paisagem o
tabuleiro fica no centro e o painel do rival e a fila vão para os lados. Canvas 2D, `devicePixelRatio` até 2.

## Bíblia de arte

- **Paleta**: azul-marinho de lagoa `#0B2545` (contorno e sombra), turquesa `#1FB5B0`, água `#7FE7E0`, coral
  `#FF6F59`, amarelo-sol `#FFD23F`, areia `#F4E1B5`, branco-pérola `#FFF8EC`. Pérolas: vermelho-coral, laranja,
  amarelo, verde-mar, azul-céu, violeta (cores bem separadas também em escala de cinza).
- **Traço**: contorno grosso e liso azul-marinho, formas redondas e gordinhas, criaturas com olhos grandes e
  expressivos. Nada fino ou rabiscado (leitura em tamanho pequeno).
- **Luz**: sol de cima à esquerda, cáusticas suaves de água, sombreado em dois tons com um brilho úmido nas pérolas.
- **UI**: painéis arredondados azul-marinho translúcido com borda turquesa, botões gordinhos (laranja = ação,
  roxo = vídeo premiado), fonte Fredoka.
- **Bloco de estilo** (fim de TODO prompt do Grok):

> Style: polished 2D cartoon mobile-game illustration, chunky rounded shapes, thick smooth dark navy outlines,
> two-tone cel shading with glossy highlights, bright tropical coral-reef palette (turquoise, coral orange, sunny
> yellow, sand, deep navy), warm sunlight from the top left with soft underwater caustics, clean and readable at
> small size, no text, no letters, no numbers, no logo, no watermark, no signature.

Sprites: `isolated on a perfectly flat solid magenta (#FF00FF) background, no shadow, no gradient, no ground, no
text` (verde `#00FF00` quando o objeto é rosa ou roxo), grades 3×3 recortadas por `tools/sprite.mjs --separar`.

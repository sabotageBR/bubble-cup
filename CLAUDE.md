# CLAUDE.md

Orientação para o Claude Code neste repositório.

## O que é

**Bubble Cup** (`bubble-cup`): bubble shooter num recife de coral, com o canhão-baiacu e pérolas coloridas. O
diferencial é a **Copa**: partidas de 2 minutos contra rivais-bot com rosto, nome e personalidade, jogando o mesmo
tabuleiro lado a lado (placar e mini-tabuleiro do rival no canto), em chave de 8, liga Bronze → Diamante, copa da
semana, aventura de 32 fases, desafio do dia, sala de 24 troféus e 9 canhões. Jogo original do estúdio (nome, tema,
personagens e arte próprios) para Poki, CrazyGames, californiagames.io e Y8, a partir do kit multiportal
(`../distribuicao/kit`, ver o README de lá). Catálogo no cofre: `../Nettools Games/Jogos/bubble-cup.md`.
Design em `docs/GDD.md` (inclui a bíblia de arte e o bloco de estilo do Grok); prompts e escolhas em `docs/autoria.md`.

## Rodar e testar

- `npm run servir` → http://127.0.0.1:5450/ (a PlataformaSDK em modo autônomo, anúncios simulados).
  Parâmetros só em localhost: `?novo`, `?fase=N` (aventura), `?copa=0..3` (copa da liga, com `&rodada=0..2` e
  `&tela=chave`), `?tela=hub|trofeus|skins`, `?skin=polvo`, `?semente=N`, `?auto` (o bot joga), `?filme=30`,
  `?semanuncio`, `?lang=pt|en|es`, `?limpo`, `?debug`.
- `npm test`: lógica pura (grade, tiro, regras, partida, IA, copa, aventura, coleção), portais e fronteiras.
- `npm run bot` (`tools/bot.mjs`): primeira sessão, copas por liga com 3 perfis de jogador e as 32 fases.
- `npm run empacotar` (5 alvos; a Y8 sai `-sem-id` até os ids do painel irem para `package.json` →
  `kit.ids.y8`) e `npm run verificar`; prova do California: de `../distribuicao`,
  `node ferramentas/provar.mjs bubble-cup`.

## Arquitetura

- `src/main.js`: único módulo que toca portal, DOM, áudio e salvamento. Ciclo do portal como no kit. Fluxo:
  primeira carga direto nas quartas contra o Pingo (tabuleiro de ensino `LAYOUT_ENSINO`: a 1ª vermelha derruba 26);
  copa → chave → partida → ... → resultado → hub (`ui/telas.js`).
- `src/jogo/`: lógica pura e determinística (sem DOM, relógio nem `Math.random`): `grade.js` (hexagonal, linhas
  deslocadas, paridade), `tiro.js` (trajetória com ricochete), `regras.js` (estouro, queda, bomba, arco-íris, gelo,
  peixe, pontos), `partida.js` (dois lados com a mesma semente, fila, fileira nova, transbordo, relógio),
  `rival.js` (IA de mira: maior faixa contínua de ângulos por casa, ruído e intervalo pela habilidade),
  `copa.js` (rivais, ligas, chave, semana ISO), `aventura.js` (32 fases + desafio do dia), `colecao.js` (troféus, skins).
- `src/render/`: `arte.js` (carga com progresso, anel de gelo derivado, tabela `BOCA` dos canhões), `desenho.js`
  (canvas e o recife vivo: molas por pérola, encaixe com quique, estouro em onda, queda com física, canhão que
  inspira e sopra; tudo só no desenho, a lógica não sabe disso).
- `src/som/sons.js`: sons sintetizados. `src/i18n/textos.js`: pt, en, es. `src/ui/telas.js` + `jogo.css`: telas DOM.
- `src/core/`: kit (não mexer sem motivo; correções voltam para `../distribuicao/kit`).
- `src/arte/`: arte processada (WebP). `arte/bruto/`: originais do Grok (fora do build). `arte/recortes/`: PNG recortados.

## Regras

- Código, comentários e docs em português; comentários ASCII em `src/jogo/`.
- Nenhum anúncio antes da 6ª rodada (partidas e fases contam juntas); intervalo só no fim de partida da copa ou na
  troca de fase; premiado só por escolha, fora do jogo ativo (chave, derrota, sem pérolas), com botão grátis igual.
  Um anúncio por pausa. Na Y8, intersticial só logo depois de clique em botão e a 180 s ou mais do anterior.
- Armazenamento só com o prefixo `bubblecup.` (`progresso`, `copa`, `mudo`); nunca `clear()`.
- Som: cada acerto é UM som; nada de cliques rápidos em sequência ("catraca", tique-taque, contagem). Pedido do
  usuário, vale para todos os jogos.
- Toda arte nova pelo `tools/grok.mjs` com o bloco de estilo do `docs/GDD.md`; conferir a olho antes de usar.
- Não fazer commit sem o usuário pedir.
- Registrar atividade no cofre: linha em `Atividades/AAAA-MM-DD.md` e histórico em `Jogos/bubble-cup.md`.

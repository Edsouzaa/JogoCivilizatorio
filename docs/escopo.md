# Escopo e ritmo do jogo

## Partida

- Até 20 jogadores por sala; por enquanto o jogo roda só no PC do jogador (sem servidor).
- Uma partida dura de 7 a 12 horas, conforme a era em que começa e termina.
- Tempo real. Qualquer jogador pode pausar; os outros despausam por votação, ou quem pausou despausa.

## Tempo por era (na velocidade média)

Eras (docs/game-desing.md): Tribal → Clássica → Medieval → Colonial → Revoluções → Imperialismo → Guerras → Multipolar → Atual.

| Era | Ritmo | Observação |
|---|---|---|
| Tribal | 1 semana = 1 s | Sem dinheiro (a definir: hoje o protótipo já tem dinheiro desde o início) |
| Clássica, Medieval, Colonial | cada uma mais lenta que a anterior (valores a definir) | |
| Revoluções em diante (Imperialismo, Guerras, Multipolar, Atual) | o dia tem 4 fases (madrugada, manhã, tarde, noite); 1 fase = 0,2 s | 1 dia = 0,8 s |

As velocidades do protótipo são: muito lenta 0,25×, lenta 0,5×, **média 1×**, rápida 2× e muito rápida 4×, sobre o ritmo da era.
No protótipo a Clássica vai a 0,5 semana/s, a Medieval a 0,35 e a Colonial a 0,25 (valores provisórios). O ritmo segue a era do país mais avançado.

## Tecnologias (src/tech.ts)

- Cada país pesquisa uma tecnologia por vez: 1 ponto por semana + 1 a cada 1.000 pessoas. Se o jogador não escolher, o país pega a mais barata.
- Tecnologias **liberam construções** (as melhorias e as indústrias começam bloqueadas) e dão **bônus de produção**.
- O país passa para a próxima era quando conhece **todas** as tecnologias da era atual.
- Hoje existem só as eras Tribal (Agricultura, Domesticação, Tecelagem, Mineração, Metalurgia do bronze) e Clássica (Irrigação, Armas de bronze, Trabalho do ferro, Estradas, Escrita). O país para na Clássica até as próximas eras ganharem tecnologias.
- A fazer: tecnologias que também **dificultam** coisas e dão **infâmia**, como pedido no design.

## Mapa

- Hexágonos de 500 km² (cerca de 1 milhão no mundo inteiro). O mundo dá a volta na horizontal: andando sempre para a direita, você volta ao ponto de partida. Os polos não dão a volta.
- Visão de cima, em 2D, com modos de mapa (terreno, político, população, recursos e outros depois).
- Cada bioma tem uma imagem em `public/biomas/<bioma>.png`. As atuais são provisórias, geradas por `npm run biomas`; para trocar a arte, basta substituir o PNG mantendo o nome.

## Cidades

- O país começa com uma capital, um território pequeno e um grupo de colonos.
- Colonos fundam cidades (tecla **C** ou botão no painel): longe de outras cidades e perto das suas, reivindicando o território em volta.
- Cada cidade é um **mercado próprio**. Os hexágonos do país compram e vendem no mercado da cidade mais próxima.
- Cidades atraem a população em volta e crescem de **tamanho**. O tamanho ocupa hexágonos urbanos em volta do centro e pode ser **passado para outra cidade** do mesmo país.
- **Indústrias só podem ser construídas em hexágonos urbanos.**

## Estados (mais para frente)

Ver docs/politica.md.

## Classes de POP (src/pops.ts)

- Os tipos de POP e as classes seguem docs/game-desing.md. A população é contada **por país**, não por hexágono, para caber em 1 milhão de hexágonos.
- **Quem é quem:** cada construção emprega tipos de POP (ex.: na era tribal, Mina = camponeses + chefes e anciãos como donos; da Clássica em diante, trabalhadores + aristocratas). Clérigos são 1% da população; burocratas e escriturários entram na Clássica; acadêmicos, com a Escrita. Quem sobra vive de subsistência: caçadores-coletores até a Agricultura, depois camponeses.
- **Renda:** 30% do PIB de mercado vai para os donos (classe alta); o resto vira salário, dividido pelo peso de salário de cada tipo. A comida de subsistência é a renda de quem vive da terra.
- **Qualidade de vida (1 a 50):** 25 = renda igual ao custo das necessidades básicas (comida, peles e madeira).
- **Efeitos hoje:** acadêmicos aumentam a pesquisa. O peso político por classe já é calculado, para os grupos políticos.
- **Lealdade (0 a 100), por tipo de POP:** anda 5% por semana em direção a um alvo: 50 + 2 × (QV − 25) + 40 × (legitimidade − 0,5). Abaixo de 30, o POP é **radical**.
- **Radicais:** cada 10% de radicais tira 3% da produção e 3 pontos de legitimidade.
- **Migração entre países (mensal):** a população rural vai para as cidades do país onde a classe baixa tem a melhor QV, se a diferença passar de 5 pontos (até 0,3% por mês). A população total se conserva. Por enquanto vale qualquer distância.
- A fazer: escravidão/servidão por lei, soldados vindos do exército, dependentes, migração só para vizinhos.

## Mapa: climas, rios, estações e névoa

- **Climas** por latitude e umidade: tropical, árido, temperado, continental e polar. Biomas: selva e savana (tropical); deserto e estepe (árido); floresta, pradaria e planície (temperado); taiga e estepe (continental); tundra e gelo (polar). Colinas e montanhas em qualquer clima.
- **Recursos** em jazidas agrupadas (vizinhos tendem a ter o mesmo recurso); minérios mais raros que recursos de fazenda e pasto.
- **Rios nas bordas dos hexágonos** (como no Civ): nascem em colinas e montanhas e descem até o mar. O trecho de baixo dos rios compridos é **navegável** (linha mais grossa) e, no futuro, recebe navios. Efeitos: +50% de população e +25% de comida de subsistência no hex; cidade em rio navegável exporta 50% mais no comércio; atravessar rio custa +1 semana e quem defende atrás do rio tem +25%.
- **Estações:** no inverno de cada hemisfério neva no clima continental (boa parte do inverno), no temperado (só no auge) e sempre no polar. Neve: −50% de comida de subsistência e +1 semana para andar.
- **Visual:** no mapa de terreno a cor do país aparece translúcida por cima do bioma; hexágonos com cantos arredondados; águas territoriais (1 hex de mar) também ficam com a cor do país.
- **Névoa de guerra** do país controlado: o que nunca foi visto fica escuro; o já explorado fica acinzentado e sem mostrar unidades estrangeiras. O país vê o próprio território (+1 hex), 3 hexes em volta das cidades e 2 em volta das unidades.

## Território e colonos

- O país começa com a capital e **raio 1** em volta; a fronteira cresce com a cidade (raio 2 a partir do tamanho 2, raio 3 a partir do 4) e inclui 1 hex de mar colado na terra.
- **Colonos são uma unidade** (quadrado no mapa): andam como tropa e fundam a cidade onde estão. A mais de 6 hexes de uma cidade do país ficam sem suprimentos e perdem 5% das pessoas por semana. Não lutam e são destruídos por exército inimigo.
- Construir não gasta manpower: o trabalho vem da população dos hexes e da cidade (por tipo de POP). Manpower é só para o exército.

## Guerra terrestre (src/war.ts)

- **Divisões** (100 soldados, sem customização): recrutadas em hex de cidade por 150 de dinheiro e 100 de manpower; custam 1 por semana e consomem 0,5 Armas por semana do mercado da capital. Sem armas lutam com metade da força. Os soldados aparecem na população como POP Soldados.
- **Controles:** clique num hex com divisões para selecionar (clicar de novo alterna entre elas); **botão direito** no mapa manda andar. Botões no painel: Recrutar divisão (hex urbano), Declarar guerra (hex de outro país), Paz (no resumo do país), Desfazer.
- **Movimento:** 1 hex por vez, em 1 semana (planície, pradaria, deserto, tundra), 2 (floresta, selva, colinas) ou 3 (montanha); oceano e gelo são intransitáveis. Só entra em território de outro país em guerra com ele. O caminho é guloso (pode travar atrás de lagos).
- **Combate:** ao tentar entrar num hex com inimigos, as duas partes perdem soldados (8% do poder inimigo por semana) e organização. Colinas, selva, floresta e montanha dão bônus a quem defende. Divisão com organização abaixo de 10% recua para um vizinho seguro, ou é destruída se não houver. Fora de combate, a organização volta e a divisão se reforça em território próprio. Baixas saem da população.
- **Ocupação:** divisão que entra em hex inimigo o ocupa (listrado no mapa político); hex ocupado não produz para o dono. Voltar ao próprio hex o liberta.
- **Paz:** a pontuação de guerra é a fração da população inimiga ocupada menos a fração própria ocupada. Quem estiver mais de 5 pontos na frente fica com os hexes que ocupou (menos a capital do perdedor); senão, paz branca.
- A fazer: IA que move tropas, frentes automáticas, suprimentos, guerra aérea e naval, exigências de paz escolhidas pelo jogador.

## O que fica fora da primeira versão jogável

A primeira versão jogável é: economia + cidades + política básica, em uma ou duas eras, single-player. O resto entra depois que isso estiver divertido.

| Cortado por enquanto | Por quê |
|---|---|
| Guerra aérea e naval | São quase jogos à parte; a guerra terrestre vem primeiro |
| Editor de mapas e mapas pagos | O mapa aleatório já cobre as partidas; o editor só vale quando houver jogadores |
| Multiplayer em rede | O jogo precisa ser divertido sozinho antes; hoje é só no PC do jogador |
| Todas as eras de uma vez | Fazer tribal → clássica bem feitas e depois avançar |
| Cultura, religião e assimilação | Dependem de população com tipos de POP e de leis, que vêm antes |
| Comércio entre países e rotas com custo | Hoje só as cidades do mesmo país trocam entre si, sem custo de distância; rotas, nós e comércio exterior depois |
| Estados | Fazem sentido quando o país tiver muitas cidades |

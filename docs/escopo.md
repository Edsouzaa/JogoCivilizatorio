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
- Todas as 9 eras têm 5 tecnologias (Tribal e Clássica com as originais; Medieval: Feudalismo, Moinhos, Arado pesado, Universidades, Castelos; Colonial: Navegação, Imprensa, Pólvora, Bancos, Mineração profunda; Revoluções: Máquina a vapor, Ferrovias, Iluminismo, Conscrição, Agricultura científica; Imperialismo: Eletricidade, Química industrial, Metralhadora, Telégrafo, Medicina moderna; Guerras: Motor a combustão, Blindados, Produção em massa, Rádio, Aviação; Multipolar: Computadores, Energia nuclear, Revolução verde, Contêineres, Mísseis; Atual: Internet, Automação, Energias renováveis, Biotecnologia, Drones).
- Efeitos: liberar construções, bônus de produção, pesquisa, **comércio** (mais troca entre cidades e com parceiros), **exército** (força de combate), **manpower** e **agitação** (Imprensa, Iluminismo, Conscrição, Energia nuclear, Internet e Automação baixam a lealdade; Medicina moderna, Rádio e Biotecnologia sobem).
- Máquina a vapor libera Siderúrgica e Fábrica têxtil; Metralhadora libera o Arsenal. Da era das Revoluções em diante as fábricas empregam Operários especializados e Engenheiros, e os donos são Capitalistas.
- A fazer: **infâmia** (pedido do design), e tecnologias que liberam unidades novas (navios, aviões).

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
- O alvo de lealdade é 50 + (QV − 25) + 40 × (legitimidade − 0,5). A penalidade de **rival** (grupo de fora com mais apoio popular que o governo) só vale no **partido único**.
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

## IA dos países (src/ai.ts)

Todo país que não é o do jogador decide uma vez por mês:
- **Expansão:** manda os colonos para o melhor lugar livre a até 6 hexes das suas cidades (fértil, com rio e recursos, sem encostar em outro país) e funda a cidade ao chegar. Treina colonos enquanto tiver menos de 3 cidades (+2 por era) e dinheiro sobrando.
- **Economia:** faz uma obra por mês onde o produto está mais caro no mercado local, respeitando tecnologia e mão de obra, sem gastar além de 1,5× o custo.
- **Política:** propõe a lei com mais apoio, se o apoio passar de 25%.
- **Exército:** uma divisão por cidade. Declara guerra raramente (1% ao mês) a vizinho a até 15 hexes com menos da metade do exército; em guerra manda as divisões paradas para a cidade inimiga mais perto; faz a paz quando a pontuação passa de 30 pontos para qualquer lado ou depois de 2 anos.
- Hoje só o país ativo é humano; com multiplayer, todos os países com jogador ficam fora da IA.

## Salvar partida (src/save.ts)

- **💾** (ou **Ctrl+S**) baixa um arquivo `.save` com a partida inteira: mundo, economia, cidades, unidades, guerras, pesquisa, política, o país controlado, a câmera e o que cada país já explorou. **📂** carrega um arquivo salvo.
- O arquivo é JSON compactado com gzip (cerca de 1,3 MB no mapa de 1 milhão de hexes; salvar leva ~1,5 s e carregar ~0,3 s).
- Ao carregar, o jogo confere se o arquivo é um save, a versão do formato e os tamanhos; se o save for de outro tamanho de mapa, avisa qual endereço abrir (`?w=…&h=…`).
- A fazer: salvamento automático e lista de saves dentro do jogo.

## Comércio exterior (acordos comerciais)

- Dois países em paz fecham um **acordo comercial** (botão no hex do outro país; a IA propõe aos vizinhos às vezes). Guerra entre eles cancela o acordo.
- No acordo, as **cidades de fronteira** (a até 25 hexes de uma cidade do parceiro; portos fluviais alcançam o dobro) trocam sobra por falta, como o comércio interno, mas só **25% da sobra por semana**.
- Quem importa cobra **10% de tarifa** sobre o valor importado, que entra no tesouro (linha "Tarifas" na aba Economia).
- A fazer: rotas e nós comerciais (mar e rios), tarifas por lei, embargos.

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

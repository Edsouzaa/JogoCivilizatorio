# Escopo e ritmo do jogo

## Partida

- Até 20 jogadores por sala; por enquanto o jogo roda só no PC do jogador (sem servidor).
- Uma partida dura de 7 a 12 horas, conforme a era em que começa e termina.
- Tempo real. Qualquer jogador pode pausar; os outros despausam por votação, ou quem pausou despausa.

## Tempo por era (na velocidade média)

| Era | Ritmo | Observação |
|---|---|---|
| Tribal | 1 semana = 1 s | Sem dinheiro (a definir: hoje o protótipo já tem dinheiro desde o início) |
| Clássica | mais lento que a tribal (valor a definir) | |
| ... até a Era das Revoluções | vai desacelerando | |
| Era das Revoluções em diante | o dia tem 4 fases (madrugada, manhã, tarde, noite); 1 fase = 0,2 s | 1 dia = 0,8 s |

As velocidades do protótipo são: muito lenta 0,25×, lenta 0,5×, **média 1×**, rápida 2× e muito rápida 4×, sobre o ritmo da era.

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

## O que fica fora da primeira versão jogável

A primeira versão jogável é: economia + cidades + política básica, em uma ou duas eras, single-player. O resto entra depois que isso estiver divertido.

| Cortado por enquanto | Por quê |
|---|---|
| Guerra aérea e naval | São quase jogos à parte; a guerra terrestre vem primeiro |
| Editor de mapas e mapas pagos | O mapa aleatório já cobre as partidas; o editor só vale quando houver jogadores |
| Multiplayer em rede | O jogo precisa ser divertido sozinho antes; hoje é só no PC do jogador |
| Todas as eras de uma vez | Fazer tribal → clássica bem feitas e depois avançar |
| Cultura, religião e assimilação | Dependem de população com tipos de POP e de leis, que vêm antes |
| Comércio entre mercados | Primeiro cada cidade sozinha; rotas e nós de comércio depois |
| Estados | Fazem sentido quando o país tiver muitas cidades |

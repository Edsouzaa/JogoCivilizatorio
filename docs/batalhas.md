# Batalhas, atrito e logística terrestre

O combate terrestre está em `src/battle.ts` e o suprimento e o atrito em `src/logistics.ts`. Todos os valores ficam em `BATTLE`, `LOGI` e `ATTRITION`, para ajustar num lugar só.

## Batalha (estilo HOI4 / EU5)

- **Quando começa:** quando um exército tenta entrar num hex defendido. A batalha é uma entidade com id, hex, lados, frente, direções de ataque, estado, baixas e histórico de rolagens.
- **Frente:** depende do terreno. Cada direção a mais de ataque soma 50%, até o dobro.

| Terreno | Frente |
|---|---|
| Planície e estepe | 100 |
| Deserto e centro de cidade | 90 |
| Tundra | 85 |
| Floresta | 80 |
| Colinas | 75 |
| Selva | 60 |
| Montanha | 50 |

- **Largura das unidades:** proporcional ao tamanho da divisão. As mais organizadas entram primeiro; o resto fica na **reserva** e entra quando a frente se desgasta.

| Categoria | Largura (divisão cheia) |
|---|---|
| Infantaria | 10 |
| Montaria | 12 |
| Artilharia e cerco | 15 |
| Blindados | 20 |

- **Rodadas:** 2 por semana, cada uma com duas fases.
  - **Fogo:** favorece artilharia e cerco.
  - **Choque:** favorece montaria e infantaria.
  - O peso do fogo cresce com a era, de 20% na tribal a 85% na moderna.
- **Dados:** 1d10 por lado e por fase. O dado vem da semente da partida, da semana e do hex, então o resultado é igual em todos os clientes no multiplayer.
- **Modificadores, todos mostrados no histórico:**
  - general (0 a +2);
  - diferença de tecnologia;
  - terreno do defensor (montanha +3, colinas e selva +2, floresta +1) e cidade +1;
  - entrincheiramento (até +2, mais com Castelos, Fortificações em estrela e Concreto armado);
  - atacar montanha −1 e atravessar rio −2;
  - flanqueamento (+1 por direção extra);
  - céu (superioridade aérea);
  - suprimento crítico (−1 ou −2), cansaço (−1), desorganização (−1) e moral baixa (−1).
- **Dano separado em dois:**
  - **Baixas:** dependem do poder do lado e da parte dele no dado. Teto de 12% da frente por fase.
  - **Organização:** perde mais quem tem menos poder e dado pior. Teto de 25% por fase.
- **Moral:** é separada da organização. Cai com as baixas e com a retirada, e volta com descanso e comida. Abaixo de 20%, a unidade foge.
- **Fim:**
  - o lado sem ninguém em condição de lutar perde;
  - o defensor derrotado **recua** para um hex próprio e seguro;
  - se estiver **cercado**, é destruído;
  - recuando de um inimigo mais rápido, perde mais 5% (perseguição);
  - batalha com mais de 12 semanas: o atacante desiste.
- **Tela:** menu Militar, seção Batalhas. Mostra as duas linhas (frente e reserva) e as rolagens com cada modificador. As batalhas em andamento aparecem no mapa com um X vermelho.

## Atrito (separado das baixas de batalha)

Atrito semanal por exército, somado:

| Causa | Valor |
|---|---|
| Terreno | planície 0,1%, desertos e montanhas 0,6–0,8% |
| Inverno com neve | dobra o do terreno e soma 0,4% |
| Território inimigo | +0,2% |
| Fome | até +3% e queda de moral |

- **Em casa:** em território próprio e abastecido, o atrito de terreno e clima cai a um quarto.
- **Medicina:** tecnologias de saúde reduzem o atrito.
- **Fadiga:** sobe marchando e desce parado. Acima de 60% tira 1 do dado e atrasa a organização.
- **Contagem à parte:** o atrito do país e o atrito por guerra ficam separados das baixas de batalha.
- **Reforço:** precisa de gente (manpower) e de armas no mercado. Sem armas, anda pela metade.

## Logística terrestre

- **Demanda por exército:** comida (grãos), mais pólvora depois da Pólvora e combustível para blindados e mecanizada.
- **De onde vem:**
  - o mercado da capital, e o exército é abastecido antes da população;
  - a capacidade de transporte do país (tamanho das cidades e estradas, crescendo com a era);
  - a distância ao depósito mais perto (cidade própria ou ocupada, posto avançado): no limite do alcance chega 40%, e Ferrovias somam 20%;
  - os exércitos em batalha recebem primeiro.
- **Estoque:** cada exército guarda 4 semanas de comida (+ 0,5 por era). Quando sobra oferta, chega até 50% a mais e o estoque enche.
- **Forragem:** o exército tira até 25% da comida da terra onde está, com um pequeno custo para a gente local.
- **Abastecimento de 0 a 100%:** completo, adequado, insuficiente, crítico, quase sem suprimentos, isolado. A falta de um bem tem efeito próprio:

| Falta | Efeito |
|---|---|
| Comida | atrito e moral |
| Munição | fase de fogo pela metade |
| Combustível | blindado parado |

- **Ficha do exército:** mostra moral, cansaço, entrincheiramento, abastecimento por bem e estoque.

## Simulação (600×240, 120 anos, guerras forçadas)

- Abastecimento médio de 96%, moral de 0,86.
- Atrito em paz perto de 10% ao ano, reposto pelo recrutamento.
- 1,8 ms por semana.

## Ainda falta (docs/proximos-sistemas.md)

- **Eventos de combate:** emboscada, carga de montaria, perda de comandante e colapso da linha.
- **Estilos de comandante:** defensivo, agressivo, cauteloso, flanqueador e outros.
- **Clima além da neve:** chuva, calor, lama.
- **Logística:** depósitos como construção com estoque próprio, rotas com capacidade por estrada ou ferrovia, prioridades escolhidas pelo jogador e mapa de suprimentos.
- **Naval e aéreo:** comboios, bloqueio de abastecimento e bases.

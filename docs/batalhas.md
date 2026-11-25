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

## Eventos de combate (battle.ts `events`)

Cada evento só acontece quando a situação permite. A chance sai do mesmo dado da batalha e o evento aparece como modificador no histórico.

| Evento | Quando | Efeito |
|---|---|---|
| Emboscada | 1ª rodada, defensor em floresta, selva, colinas ou taiga, atacante sem montaria para reconhecer (35%) | atacante −2 |
| Carga de montaria | fase de choque em campo aberto, lado com 30% ou mais de montaria (40%) | +2; contra posição entrincheirada, −1 |
| Bombardeio preparatório | fogo na 1ª rodada, lado com 20% ou mais de artilharia ou cerco e com munição (50%) | +2 e tira 0,5 de entrincheiramento do inimigo |
| Colapso da linha | organização abaixo de 30% e moral abaixo de 50% (50%) | −2 e menos moral |
| Falta de munição | fase de fogo sem munição | aviso (o fogo já cai pela metade) |
| Perda de comandante | lado que perdeu mais rodadas na semana (3%) | o general morre ou é capturado; −10% de organização e moral |

## Estilos de comandante (characters.ts `styleOf`)

O estilo vem do traço quando combina (Cauteloso; Guerreiro ou Cruel = Agressivo; Carismático = Inspirador; Erudito = Logístico). Sem traço que combine, é fixo pelo id do general.

| Estilo | Efeito |
|---|---|
| Defensivo | +1 no dado defendendo |
| Agressivo | +1 no dado atacando; perde 10% a mais de soldados |
| Cauteloso | −20% de baixas próprias; −0,5 no dado atacando |
| Flanqueador | o bônus de flanco vale o dobro |
| Logístico | +15% de suprimento entregue ao exército |
| Inspirador | a moral cai 30% mais devagar |

## Tempo da semana (world.ts `weatherAt`)

O tempo vale por blocos de 8×8 hexes e vem do clima da região, da estação e da semana. É determinístico.

| Tempo | Efeito |
|---|---|
| Chuva | −1 no tiro; anda 30% mais devagar; um pouco de doença |
| Lama (duas semanas de chuva) | −1 no choque para montaria e blindados; marcha muito mais lenta; entrega −25%; mais fadiga |
| Calor (verão árido ou tropical) | −1 para quem ataca; desidratação; mais fadiga |
| Neblina | −1 para quem ataca |
| Neve | −1 para quem ataca; o atrito de antes; entrega −25% |

A ficha do exército mostra o tempo onde ele está.

## Depósito de suprimentos (construção)

- **Onde:** qualquer hex de terra do país, com 10 trabalhadores por nível, sem produzir nada.
- **Efeito:** vira fonte de suprimento, como uma cidade, e cada nível soma capacidade de transporte (150 soldados por semana, × 1 + era/3).
- **IA:** em guerra, com um exército passando fome, ela constrói um depósito no hex do país mais perto dele.

## Prioridade de abastecimento e mapa

- **Prioridade:** cada exército pode ter uma (Emergência, Frente de batalha, Em preparação, Guarnição, Reserva, Treinamento). Sem escolha, quem está em combate é Frente e o resto é Guarnição. Com pouca capacidade, a prioridade maior recebe primeiro.
- **Camada de mapa "Suprimento"** (grupo Militar): distância ao depósito mais perto pelo alcance. Verde é completo, amarelo é reduzido, laranja é crítico e vermelho está além do alcance.

## Ainda falta (docs/proximos-sistemas.md)

- **Rotas:** com capacidade própria por estrada, ferrovia ou rio e interrupção por ocupação. Hoje a distância é em linha reta até o depósito, e a capacidade é do país.
- **Exército:** reconhecimento como atributo e engenheiros.
- **Naval e aéreo:** comboios, bloqueio de abastecimento ultramarino, bases e combustível de avião.
- **Interface:** painel de atrito com filtros e caminho do suprimento até o exército selecionado.
